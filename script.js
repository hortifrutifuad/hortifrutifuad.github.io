document.addEventListener('DOMContentLoaded', () => {
    const selectBairro = document.getElementById('bairro');
    const boxResultado = document.getElementById('resultado-frete');
    const btnWhatsapp = document.getElementById('btn-pedir-whatsapp');

    // Tabela de fretes simulada (Lógica de Negócio)
    const regrasFrete = {
        'retirada': {
            nome: 'Retirada na Loja',
            taxa: 'Grátis',
            minimo: 'Sem valor mínimo',
            mensagem: 'Olá! Estou no site e gostaria de fazer um pedido para *retirar na loja*.'
        },
        'pirituba': {
            nome: 'Pirituba',
            taxa: 'Grátis',
            minimo: 'R$ 30,00',
            mensagem: 'Olá! Estou no site e gostaria de fazer um pedido para entrega em Pirituba.'
        },
        'freguesia': {
            nome: 'Freguesia do Ó',
            taxa: 'R$ 5,00',
            minimo: 'R$ 40,00',
            mensagem: 'Olá! Estou no site e gostaria de fazer um pedido para entrega na Freguesia do Ó.'
        },
        'lapa': {
            nome: 'Lapa',
            taxa: 'R$ 7,00',
            minimo: 'R$ 50,00',
            mensagem: 'Olá! Estou no site e gostaria de fazer um pedido para entrega na Lapa.'
        },
        'zonanorte': {
            nome: 'Zona Norte',
            taxa: 'Sob Consulta',
            minimo: 'R$ 80,00',
            mensagem: 'Olá! Estou no site e gostaria de consultar a taxa de entrega para a Zona Norte.'
        },
        'outros': {
            nome: 'Outras Regiões',
            taxa: 'Apenas Retirada ou Consulta',
            minimo: 'N/A',
            mensagem: 'Olá! Vi o site e gostaria de saber se entregam na minha região.'
        }
    };

    // Número do WhatsApp da loja (Coloque o número real aqui, com o código do país 55 e DDD)
    const numeroLoja = '5511999999999';

    selectBairro.addEventListener('change', (e) => {
        const bairroEscolhido = e.target.value;

        if (bairroEscolhido === 'none') {
            boxResultado.classList.add('hidden');
            btnWhatsapp.classList.add('hidden');
            return;
        }

        const regra = regrasFrete[bairroEscolhido];
        
        // Verifica o horário atual para determinar o prazo (apenas para entregas)
        const agora = new Date();
        const horaAtual = agora.getHours();
        let prazo = "";
        
        if (bairroEscolhido !== 'retirada' && bairroEscolhido !== 'outros') {
            if (horaAtual < 12) {
                prazo = "<p><strong>Prazo Estimado:</strong> Entrega hoje no final da tarde.</p>";
            } else {
                prazo = "<p><strong>Prazo Estimado:</strong> Entrega amanhã (sujeito à disponibilidade).</p>";
            }
        } else if (bairroEscolhido === 'retirada') {
             prazo = "<p><strong>Retirada:</strong> Separaremos seu pedido em breve para retirada no local.</p>";
        }

        // Atualiza a UI com o resultado
        boxResultado.innerHTML = `
            <h4>Condições para ${regra.nome}</h4>
            <p><strong>Taxa/Frete:</strong> ${regra.taxa}</p>
            <p><strong>Pedido Mínimo:</strong> ${regra.minimo}</p>
            ${prazo}
        `;
        boxResultado.classList.remove('hidden');

        // Configura o botão do WhatsApp
        const textoCodificado = encodeURIComponent(regra.mensagem);
        const linkWa = `https://wa.me/${numeroLoja}?text=${textoCodificado}`;
        
        btnWhatsapp.onclick = () => {
            window.open(linkWa, '_blank');
        };
        btnWhatsapp.classList.remove('hidden');
    });
});
