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

    // --- Parâmetros de precificação -----------------------------------------------------
    // Não temos frota própria: toda entrega é feita chamando um motoboy avulso (Uber Flash).
    // Os valores abaixo são uma ESTIMATIVA para dar uma ideia de preço ao cliente antes de
    // pedir. AJUSTAR estes dois valores com base em cotações reais do Uber Flash na região.
    const TARIFA_BASE = 8;             // R$ - custo fixo de acionar o motoboy
    const VALOR_POR_KM = 2;            // R$ por km estimado
    // ------------------------------------------------------------------------------------
    const FATOR_CORRECAO_ROTA = 1.3;   // aproxima a distância em linha reta da distância real de rua
    const VELOCIDADE_MEDIA_KMH = 20;   // velocidade média urbana, usada só para estimar o tempo
    const TEMPO_DESPACHO_MIN = 10;     // minutos extras estimados para aceite/preparo do motoboy
    const PEDIDO_MINIMO_ENTREGA = 150; // toda entrega paga esse mínimo, à parte da taxa
    const DISTANCIA_MAXIMA_KM = 15;    // acima disso, tratamos manualmente via WhatsApp

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

    async function geocodificarCep(cepLimpo) {
        const resposta = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${cepLimpo}&country=Brazil&format=json&limit=1`
        );
        const dados = await resposta.json();
        if (!dados || !dados.length) return null;
        return { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) };
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
            const respostaViaCep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const enderecoViaCep = await respostaViaCep.json();

            if (enderecoViaCep.erro) {
                mostrarFallbackManual('CEP não encontrado. Vamos confirmar o valor da entrega direto no WhatsApp.');
                return;
            }

            const coordenadas = await geocodificarCep(cepLimpo);
            if (!coordenadas) {
                mostrarFallbackManual('Não conseguimos localizar esse CEP no mapa automaticamente.');
                return;
            }

            const distanciaReta = distanciaHaversineKm(LOJA_LAT, LOJA_LNG, coordenadas.lat, coordenadas.lng);
            const distanciaEstimada = distanciaReta * FATOR_CORRECAO_ROTA;

            if (distanciaEstimada > DISTANCIA_MAXIMA_KM) {
                mostrarFallbackManual(
                    `Seu endereço fica a aprox. ${distanciaEstimada.toFixed(1)} km, fora do nosso raio automático. Vamos confirmar a entrega no WhatsApp.`
                );
                return;
            }

            const taxaEstimada = TARIFA_BASE + VALOR_POR_KM * distanciaEstimada;
            const tempoEstimadoMin = Math.round((distanciaEstimada / VELOCIDADE_MEDIA_KMH) * 60) + TEMPO_DESPACHO_MIN;

            const agora = new Date();
            const prazo =
                agora.getHours() < 12
                    ? 'Entrega hoje no final da tarde.'
                    : 'Entrega amanhã (sujeito à disponibilidade).';

            const cepFormatado = `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
            const enderecoTexto = `${enderecoViaCep.bairro}, ${enderecoViaCep.localidade}`;

            boxResultado.innerHTML = `
                <h4>Entrega estimada para ${enderecoTexto}</h4>
                <p><strong>Distância aproximada:</strong> ${distanciaEstimada.toFixed(1)} km</p>
                <p><strong>Tempo estimado:</strong> ~${tempoEstimadoMin} min após o despacho</p>
                <p><strong>Taxa de entrega (estimada):</strong> ${formatarReais(taxaEstimada)}</p>
                <p><strong>Pedido Mínimo:</strong> ${formatarReais(PEDIDO_MINIMO_ENTREGA)}</p>
                <p><strong>Prazo Estimado:</strong> ${prazo}</p>
                <p class="aviso-taxa-a-parte">Valor estimado com base em app de motoboy (Uber Flash). O valor final é confirmado no momento do pedido e cobrado à parte do pedido mínimo.</p>
            `;
            boxResultado.classList.remove('hidden');
            limparStatusCep();

            const mensagem =
                `Olá! Estou no site e gostaria de fazer um pedido para entrega em ${enderecoTexto} ` +
                `(CEP: ${cepFormatado}). Taxa de entrega estimada: ${formatarReais(taxaEstimada)} ` +
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
