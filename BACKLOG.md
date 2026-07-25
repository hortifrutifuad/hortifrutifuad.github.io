# Backlog — Hortifruti Fuad

Backlog operacional do site. O README traz a visão de fases (peça de
portfólio); aqui ficam as decisões, pendências e armadilhas do dia a dia.

## O que é este projeto

Landing page estática (HTML/CSS/JS puro, sem build) hospedada no GitHub Pages
em `hortifrutifuad.github.io`. Não é e-commerce: o site qualifica o lead e
joga para o WhatsApp, onde a venda fecha. Branch `main` é produção — todo push
nela publica o site.

## Concluído recentemente

- **Pedido mínimo de entrega para R$ 100** (`5833c81`). Era R$ 150. O valor
  vivia em três lugares — a constante do simulador e dois textos fixos no
  `index.html`. Ao mexer nesse número, mexa nos três, senão a página se
  contradiz.
- **Correção da geocodificação de CEP + tabela de frete** (`dc24c2a`). Ver
  detalhes na seção de decisões abaixo.
- Simulador de frete por distância (`1ecb3b6`), botão flutuante de WhatsApp e
  seção de localização (`a0e0e38`), fotos proprietárias (`8c9787a`).

## Decisões vigentes (frete)

- **Raio de entrega: 5 km.** Fora disso o cliente cai numa tela própria que
  oferece combinar no WhatsApp, chamar o motoboy por conta ou retirar na loja.
  Escolha deliberada: automatizar o caso comum, negociar o raro e caro.
- **Taxa: R$ 10 fixos até 2 km, + R$ 1,50 por km adicional.** Teto prático de
  R$ 13 dentro do raio. É tabela da loja, não repasse do app — a variação de
  preço do motoboy é absorvida pela loja.
- **Geocodificação em cascata**, porque nenhuma fonte cobre tudo:
  1. AwesomeAPI (`cep.awesomeapi.com.br`) — devolve lat/lng direto do CEP.
  2. ViaCEP + Nominatim por rua (busca estruturada `street/city/state`).
  3. Nominatim por bairro (busca livre), marcado como precisão menor.

  O parâmetro `postalcode` do Nominatim **não funciona para CEP brasileiro** —
  foi a causa do bug original em que a maioria dos CEPs válidos falhava. Não
  volte para ele.

## Pendências abertas / inconsistências

- **O R$ 10 nunca foi validado contra custo real.** É o número que roda em
  quase todo pedido, e ninguém conferiu quanto o Uber Flash cobra de fato numa
  corrida de ~2 km na região. Com o mínimo em R$ 100, a taxa virou fatia maior
  do ticket — se estiver abaixo do custo, a loja subsidia cada entrega. Resolve
  com uma cotação no app: loja → endereço a ~2 km.
- **Distância é estimativa, não rota real.** Haversine (linha reta) × 1,3. Perto
  da fronteira de 5 km o erro pesa, e um endereço pode cair do lado errado do
  corte. Rota real exigiria API paga de rotas.
- **Coordenada da loja é aproximada** — centroide do CEP 02968-000, não o ponto
  exato da porta. Vale conferir no mapa e fixar a coordenada real.
- **"Entrega hoje / amanhã" usa o relógio do visitante** (`new Date().getHours()`),
  não o do servidor. Cliente em outro fuso vê o prazo errado. Irrelevante para o
  público local, mas é uma bomba-relógio se um dia o alcance crescer.
- **Nominatim tem limite de ~1 req/s** e é caminho de fallback. Volume atual não
  chega perto, mas se o tráfego crescer, trocar por serviço com chave.

## Próximos passos candidatos

Não priorizados — são ideias, não compromisso.

- Máscara de CEP no input e submit ao apertar Enter (hoje só o clique funciona).
- Cache dos CEPs já consultados (localStorage) para poupar chamada repetida.
- Fixar a coordenada exata da loja.
- Fase 2 do README: seção de receitas e dicas.
- Automação n8n + Evolution API (pausada).

## Notas pra retomar rápido

**Rodar local.** É site estático, mas não abra por `file://` — as APIs de CEP
quebram por CORS. Suba um servidor:

```
python -m http.server 8765 --bind 127.0.0.1
```

**Testar o simulador sem clicar à mão.** Chrome headless com CDP resolve, sem
instalar nada (o Node do sistema já tem `WebSocket` e `fetch` embutidos):

```
chrome.exe --headless=new --remote-debugging-port=9222 --user-data-dir=<temp>
```

Depois é conectar no WebSocket de `http://127.0.0.1:9222/json/list` e dirigir
por `Runtime.evaluate`. Casos que valem sempre testar: CEP dentro do raio, CEP
fora, CEP inexistente e CEP malformado.

**CEPs de referência** (distância a partir da loja):

| CEP | Bairro | Distância | Esperado |
|---|---|---|---|
| 02968-000 | Vila Maria Trindade | 0,3 km | R$ 10,00 |
| 02940-000 | Jardim Cidade Pirituba | 2,1 km | R$ 10,08 |
| 05172-185 | Vila Pirituba | 4,8 km | R$ 14,18 |
| 02465-000 | Imirim | 7,4 km | fora do raio |
