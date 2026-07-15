# Base de Conhecimento: Local Business Booster (Hortifruti)

Este documento centraliza toda a estratégia, benchmarking e arquitetura técnica desenvolvida para a criação de soluções digitais voltadas para pequenos comércios locais, utilizando o case "Hortifruti Fuad" como modelo. Ideal para ingestão em bases de Inteligência Artificial como o NotebookLM.

## 1. O Problema Logístico (Estudo de Caso Hortifruti)
Pequenos comércios que dependem de fornecimento diário com preços voláteis (como o Ceasa) sofrem com a "ruptura de estoque". Cobrar antecipadamente pelo site (via e-commerce tradicional) gera estornos e atrito com o cliente quando o produto acaba na gôndola.

## 2. A Solução Estratégica
- **O Site como Vitrine (Lead Gen):** O site atua apenas como mostruário e captador de intenção de compra. Não processa pagamentos diretos na página inicial.
- **Funil de Vendas Conversacional:** Todo pedido é direcionado para o WhatsApp.
- **Cobrança Pós-Separação:** O pagamento (PagSeguro/Pix) só é enviado ao cliente *após* a separação física do pedido na loja, garantindo 100% de precisão de estoque.

## 3. Arquitetura Tecnológica ("Custo Zero de Servidor")
- **Frontend:** Landing Page em HTML/CSS/JS otimizado para SEO Local. Hospedagem 100% gratuita no GitHub Pages (URL limpa: marca.github.io).
- **Automação (Fase 2):** Orquestração feita via **n8n** acoplado a uma API de WhatsApp (Ex: Evolution API) rodando em uma VPS de baixo custo.
- **Frete Dinâmico:** Integração do n8n com a API do Google Maps para calcular distância e precificar entregas locais, com transbordo para Lalamove/Uber Direct quando a distância ou volume exigirem.

## 4. Atualização Dinâmica de Ofertas (O Gatilho One-Click)
Para evitar que o dono do negócio precise lidar com códigos ou painéis complexos:
1. O comerciante envia uma foto e o preço da oferta em um grupo restrito de WhatsApp ("Admin").
2. O n8n intercepta a mensagem.
3. O n8n atualiza um arquivo JSON no GitHub ou insere a linha no Google Sheets.
4. O site lê essa fonte dinamicamente e atualiza a vitrine de promoções de forma automática e imediata.

## 5. Benchmarking de Mercado (Mapeamento de Concorrência SP)
- **Quitanda (Pinheiros):** Referência em design boutique e percepção de altíssimo valor. O site deve refletir organização e frescor absolutos.
- **Oba / Natural da Terra:** Foco brutal em conversão rápida para aplicativos e WhatsApp, com ofertas sazonais em destaque e rotas claras.
- **Pomar & Cia / Sacolão Higienópolis:** Força no SEO Local (Google Meu Negócio) e agilidade em responder reviews, além de postagens semanais na ficha do Google.

## 6. Produto (Skill) Derivada: Local-Business-Booster
Esta metodologia foi empacotada na skill automatizada `local-business-booster`, capaz de replicar a infraestrutura de código (GitHub Pages + SEO) em minutos para novos nichos (padarias, oficinas, clínicas).
