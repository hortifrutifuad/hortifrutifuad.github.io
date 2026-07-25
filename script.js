document.addEventListener('DOMContentLoaded', () => {
    const btnModoRetirada = document.getElementById('btn-modo-retirada');
    const btnModoEntrega = document.getElementById('btn-modo-entrega');
    const blocoCep = document.getElementById('bloco-cep');
    const inputCep = document.getElementById('cep');
    const btnVerificarCep = document.getElementById('btn-verificar-cep');
    const cepStatus = document.getElementById('cep-status');
    const boxResultado = document.getElementById('resultado-frete');
    const btnWhatsapp = document.getElementById('btn-pedir-whatsapp');

    // Se os elementos do simulador não estiverem na página, encerra a execução
    if (!btnModoRetirada) return;

    // Coordenadas aproximadas da loja (centroide do CEP 02968-000, obtido via Nominatim/OpenStreetMap)
    const LOJA_LAT = -23.4808927;
    const LOJA_LNG = -46.7080163;

    // --- Tabela de frete da loja ---------------------------------------------------------
    // Não temos frota própria: chamamos um motoboy avulso (Uber Flash / 99 Entregas). O preço
    // deles varia com horário e demanda, mas o cliente paga a TABELA FIXA abaixo — a diferença
    // fica com a loja. Por isso o valor por km excedente precisa cobrir o custo real do app.
    const TAXA_RAIO_BASE = 10;         // R$ - qualquer entrega dentro do raio base
    const RAIO_BASE_KM = 2;            // km cobertos pela taxa fixa
    const VALOR_POR_KM_EXCEDENTE = 1.5; // R$ por km acima do raio base
    // ------------------------------------------------------------------------------------
    const FATOR_CORRECAO_ROTA = 1.3;   // aproxima a distância em linha reta da distância real de rua
    const VELOCIDADE_MEDIA_KMH = 20;   // velocidade média urbana, usada só para estimar o tempo
    const TEMPO_DESPACHO_MIN = 10;     // minutos extras estimados para aceite/preparo do motoboy
    const PEDIDO_MINIMO_ENTREGA = 100; // toda entrega paga esse mínimo, à parte da taxa
    const DISTANCIA_MAXIMA_KM = 5;     // raio de entrega da loja; fora dele, combinamos no WhatsApp
    const TIMEOUT_API_MS = 7000;

    const numeroLoja = '5511992697948';

    function toRad(graus) {
        return (graus * Math.PI) / 180;
    }

    // Distância em linha reta entre dois pontos (fórmula de Haversine)
    function distanciaHaversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function escaparHtml(texto) {
        const elemento = document.createElement('span');
        elemento.textContent = texto;
        return elemento.innerHTML;
    }

    function formatarReais(valor) {
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }

    function mostrarStatusCep(mensagem, tipo) {
        cepStatus.textContent = mensagem;
        cepStatus.classList.remove('hidden', 'cep-status-erro', 'cep-status-aviso');
        cepStatus.classList.add(tipo === 'erro' ? 'cep-status-erro' : 'cep-status-aviso');
    }

    function limparStatusCep() {
        cepStatus.classList.add('hidden');
        cepStatus.textContent = '';
    }

    function abrirWhatsapp(mensagem) {
        const link = `https://wa.me/${numeroLoja}?text=${encodeURIComponent(mensagem)}`;
        btnWhatsapp.onclick = () => window.open(link, '_blank');
        btnWhatsapp.classList.remove('hidden');
    }

    function mostrarRetirada() {
        btnModoRetirada.classList.add('ativo');
        btnModoEntrega.classList.remove('ativo');
        blocoCep.classList.add('hidden');
        limparStatusCep();
        boxResultado.innerHTML = `
            <h4>Retirada na Loja</h4>
            <p><strong>Taxa:</strong> Grátis</p>
            <p><strong>Pedido Mínimo:</strong> Sem valor mínimo</p>
            <p><strong>Retirada:</strong> Separaremos seu pedido em breve para retirada no local.</p>
        `;
        boxResultado.classList.remove('hidden');
        abrirWhatsapp('Olá! Estou no site e gostaria de fazer um pedido para *retirar na loja*.');
    }

    function prepararEntrega() {
        btnModoEntrega.classList.add('ativo');
        btnModoRetirada.classList.remove('ativo');
        blocoCep.classList.remove('hidden');
        boxResultado.classList.add('hidden');
        btnWhatsapp.classList.add('hidden');
        limparStatusCep();
    }

    // Endereço válido, porém longe: não é falha de cálculo, é fora da área de cobertura.
    function mostrarForaDoRaio(distanciaEstimada) {
        mostrarStatusCep(
            `Seu endereço fica a aprox. ${distanciaEstimada.toFixed(1)} km da loja.`,
            'aviso'
        );
        boxResultado.innerHTML = `
            <h4>Fora do nosso raio de entrega</h4>
            <p>Entregamos até ${DISTANCIA_MAXIMA_KM} km da loja. Para o seu endereço, dá para
            combinar pelo WhatsApp: você pode chamar o motoboy por conta (Uber Flash, 99 Entregas)
            ou retirar direto na loja, sem taxa e sem pedido mínimo.</p>
        `;
        boxResultado.classList.remove('hidden');
        abrirWhatsapp(
            `Olá! Meu endereço fica a aprox. ${distanciaEstimada.toFixed(1)} km da loja, fora do raio de ` +
            `entrega. Podemos combinar como fazer?`
        );
    }

    function mostrarFallbackManual(mensagemStatus) {
        mostrarStatusCep(mensagemStatus, 'aviso');
        boxResultado.innerHTML = `
            <h4>Vamos calcular sua entrega no WhatsApp</h4>
            <p>Não conseguimos estimar automaticamente para esse CEP. Envie seu endereço completo
            que confirmamos o valor por lá.</p>
        `;
        boxResultado.classList.remove('hidden');
        abrirWhatsapp('Olá! Gostaria de saber o valor da entrega para o meu endereço.');
    }

    // Aborta a chamada se a API demorar demais, para o botão não ficar travado em "Calculando..."
    async function buscarJson(url) {
        const controle = new AbortController();
        const timer = setTimeout(() => controle.abort(), TIMEOUT_API_MS);
        try {
            const resposta = await fetch(url, { signal: controle.signal });
            if (!resposta.ok) return null;
            return await resposta.json();
        } catch (erro) {
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    // Fonte principal: devolve o CEP já com latitude/longitude do logradouro.
    // Em CEP geral de cidade (sem rua nem bairro) o retorno é o centro do município,
    // então marcamos a precisão como 'cidade' para não passar confiança demais ao cliente.
    async function localizarPorCepGeo(cepLimpo) {
        const dados = await buscarJson(`https://cep.awesomeapi.com.br/json/${cepLimpo}`);
        if (!dados || dados.code || !dados.lat || !dados.lng) return null;
        return {
            lat: parseFloat(dados.lat),
            lng: parseFloat(dados.lng),
            bairro: dados.district || '',
            cidade: dados.city || '',
            precisao: dados.address || dados.district ? 'rua' : 'cidade'
        };
    }

    async function buscarEnderecoViaCep(cepLimpo) {
        const dados = await buscarJson(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!dados || dados.erro) return null;
        return {
            logradouro: dados.logradouro || '',
            bairro: dados.bairro || '',
            cidade: dados.localidade || '',
            uf: dados.uf || ''
        };
    }

    async function geocodificarNominatim(parametros) {
        const dados = await buscarJson(
            `https://nominatim.openstreetmap.org/search?${parametros}&format=json&limit=1`
        );
        if (!Array.isArray(dados) || !dados.length) return null;
        return { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) };
    }

    // O Nominatim quase não indexa CEP brasileiro, então buscamos pelo endereço que o CEP
    // representa: primeiro a rua, e se ela não existir no mapa, o bairro.
    async function geocodificarEndereco(endereco) {
        if (!endereco.cidade) return null;

        if (endereco.logradouro) {
            const params = new URLSearchParams({
                street: endereco.logradouro,
                city: endereco.cidade,
                state: endereco.uf,
                country: 'Brazil'
            });
            const coords = await geocodificarNominatim(params.toString());
            if (coords) {
                return { ...coords, bairro: endereco.bairro, cidade: endereco.cidade, precisao: 'rua' };
            }
        }

        if (endereco.bairro) {
            const busca = `${endereco.bairro}, ${endereco.cidade}, ${endereco.uf}, Brasil`;
            const coords = await geocodificarNominatim(`q=${encodeURIComponent(busca)}`);
            if (coords) {
                return { ...coords, bairro: endereco.bairro, cidade: endereco.cidade, precisao: 'bairro' };
            }
        }

        return null;
    }

    async function localizarCep(cepLimpo) {
        const porCepGeo = await localizarPorCepGeo(cepLimpo);
        if (porCepGeo) return porCepGeo;

        const endereco = await buscarEnderecoViaCep(cepLimpo);
        if (!endereco) return { erro: 'cep-inexistente' };

        return (await geocodificarEndereco(endereco)) || { erro: 'sem-coordenadas' };
    }

    async function verificarCep() {
        const cepLimpo = (inputCep.value || '').replace(/\D/g, '');

        if (!/^\d{8}$/.test(cepLimpo)) {
            mostrarStatusCep('CEP inválido. Confira os 8 números e tente novamente.', 'erro');
            return;
        }

        limparStatusCep();
        btnVerificarCep.disabled = true;
        btnVerificarCep.textContent = 'Calculando...';

        try {
            const local = await localizarCep(cepLimpo);
            if (local.erro) {
                mostrarFallbackManual(
                    local.erro === 'cep-inexistente'
                        ? 'CEP não encontrado. Confira os números ou fale com a gente no WhatsApp.'
                        : 'Não conseguimos localizar esse CEP no mapa. Vamos confirmar a entrega no WhatsApp.'
                );
                return;
            }

            const distanciaReta = distanciaHaversineKm(LOJA_LAT, LOJA_LNG, local.lat, local.lng);
            const distanciaEstimada = distanciaReta * FATOR_CORRECAO_ROTA;

            if (distanciaEstimada > DISTANCIA_MAXIMA_KM) {
                mostrarForaDoRaio(distanciaEstimada);
                return;
            }

            const kmExcedente = Math.max(0, distanciaEstimada - RAIO_BASE_KM);
            const taxaEstimada = TAXA_RAIO_BASE + VALOR_POR_KM_EXCEDENTE * kmExcedente;
            const tempoEstimadoMin = Math.round((distanciaEstimada / VELOCIDADE_MEDIA_KMH) * 60) + TEMPO_DESPACHO_MIN;

            const agora = new Date();
            const prazo =
                agora.getHours() < 12
                    ? 'Entrega hoje no final da tarde.'
                    : 'Entrega amanhã (sujeito à disponibilidade).';

            const cepFormatado = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
            const enderecoTexto = [local.bairro, local.cidade].filter(Boolean).join(', ');
            const avisosPrecisao = {
                bairro: 'Localizamos seu CEP pelo bairro, então a distância pode variar um pouco.',
                cidade: 'Esse CEP é geral da cidade, sem rua específica. A distância é uma média — confirmamos o valor exato no WhatsApp.'
            };
            const avisoPrecisao = avisosPrecisao[local.precisao]
                ? `<p class="aviso-taxa-a-parte">${avisosPrecisao[local.precisao]}</p>`
                : '';

            boxResultado.innerHTML = `
                <h4>Entrega estimada para ${escaparHtml(enderecoTexto)}</h4>
                <p><strong>Distância aproximada:</strong> ${distanciaEstimada.toFixed(1)} km</p>
                <p><strong>Tempo estimado:</strong> ~${tempoEstimadoMin} min após o despacho</p>
                <p><strong>Taxa de entrega:</strong> ${formatarReais(taxaEstimada)}</p>
                <p><strong>Pedido Mínimo:</strong> ${formatarReais(PEDIDO_MINIMO_ENTREGA)}</p>
                <p><strong>Prazo Estimado:</strong> ${prazo}</p>
                ${avisoPrecisao}
                <p class="aviso-taxa-a-parte">Taxa fixa de ${formatarReais(TAXA_RAIO_BASE)} até ${RAIO_BASE_KM} km, mais ${formatarReais(VALOR_POR_KM_EXCEDENTE)} por km adicional. Cobrada à parte do pedido mínimo.</p>
            `;
            boxResultado.classList.remove('hidden');
            limparStatusCep();

            const mensagem =
                `Olá! Estou no site e gostaria de fazer um pedido para entrega em ${enderecoTexto} ` +
                `(CEP: ${cepFormatado}). Taxa de entrega: ${formatarReais(taxaEstimada)} ` +
                `(aprox. ${distanciaEstimada.toFixed(1)} km).`;
            abrirWhatsapp(mensagem);
        } catch (erro) {
            mostrarFallbackManual('Não foi possível calcular agora. Vamos confirmar o valor da entrega direto no WhatsApp.');
        } finally {
            btnVerificarCep.disabled = false;
            btnVerificarCep.textContent = 'Calcular';
        }
    }

    btnModoRetirada.addEventListener('click', mostrarRetirada);
    btnModoEntrega.addEventListener('click', prepararEntrega);
    btnVerificarCep.addEventListener('click', verificarCep);
});
