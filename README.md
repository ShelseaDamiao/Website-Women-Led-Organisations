# Comunidados — Registo Nacional das Organizações da Sociedade Civil

Site estático com um formulário único de registo, em que cada organização indica o seu tipo e se classifica (liderada por mulheres, por jovens, de base comunitária, etc.), e um diretório público pesquisável com os contactos que cada organização tornou públicos. Os dados são gravados numa Google Sheet através do Google Apps Script. Não precisa de servidor nem de base de dados paga.

## Estrutura do projeto

```
comunidados-website/
├── index.html            Páginas: início (com pesquisa), registo, diretório, sobre
├── css/style.css         Estilos (paleta azul)
├── js/config.js          URL da Google Sheet e email de contacto  ← editar
├── js/dados.js           Listas e campos dos formulários          ← editar para mudar campos
├── js/app.js             Navegação, validação, envio e diretório
└── apps-script/Code.gs   Código a colar no Google Apps Script
```

## 1. Ligar à Google Sheet

1. Crie uma Google Sheet nova, por exemplo "Comunidados — Base de dados".
2. Abra **Extensões > Apps Script**, apague o código de exemplo e cole o conteúdo de `apps-script/Code.gs`. Guarde.
3. No menu de funções escolha `configurar` e clique **Executar**. Autorize o acesso quando pedido. Será criada a folha `Registo_OSC`.
4. Clique **Implementar > Nova implementação**, tipo **Aplicação Web**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie o URL que termina em `/exec` e cole-o em `js/config.js`:

```js
APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXX/exec",
```

Opcional: em `Code.gs`, preencha `EMAIL_AVISO` para receber um email a cada novo registo.

> Sempre que alterar o `Code.gs`, use **Implementar > Gerir implementações > Editar > Nova versão**. Assim o URL mantém-se igual.

## 2. Como os registos são publicados

O registo não pede documentos nem aprovação: cada organização entra na folha com o Estado **Publicado** e aparece no diretório em poucos minutos. Para retirar uma organização (por exemplo, um registo falso ou um pedido da própria organização), mude o Estado para **Removido** na folha.

O diretório mostra os campos listados em `CAMPOS_PUBLICOS` no `Code.gs`, incluindo a secção "Contactos para o público" do formulário. Os dados da pessoa responsável (colunas `rep_*`) nunca são publicados.

Para mudar as classificações disponíveis (liderada por mulheres, por jovens, etc.), edite a lista `CLASSIFICACOES` em `js/dados.js`. A secção extra de liderança feminina só aparece quando a organização marca "Liderada por mulheres". Registos com um nome já existente são recusados para evitar duplicados.

## 3. Publicar com GitHub

```bash
git init
git add .
git commit -m "Primeira versão do site Comunidados"
git branch -M main
git remote add origin https://github.com/SEU-UTILIZADOR/comunidados-website.git
git push -u origin main
```

Depois, no GitHub: **Settings > Pages > Source: Deploy from a branch > main / (root)**. O site fica disponível em `https://SEU-UTILIZADOR.github.io/comunidados-website/` e actualiza a cada `git push`.

Para um domínio próprio (por exemplo `comunidados.org.mz`), indique-o em **Settings > Pages > Custom domain** e configure o DNS no fornecedor do domínio.

### Fluxo de trabalho recomendado

- `main` tem sempre a versão publicada.
- Para cada alteração crie um branch: `git checkout -b novo-campo-parceiros`
- Faça commits pequenos com mensagens claras e abra um Pull Request no GitHub para rever antes de juntar ao `main`.

## 4. Alterar os formulários

Todos os campos estão em `js/dados.js`. Para acrescentar uma pergunta, junte um objecto à secção certa, por exemplo:

```js
{ name: "ano_ultimo_relatorio", label: "Ano do último relatório de actividades", type: "number", min: 1990 }
```

A coluna correspondente é criada automaticamente na Google Sheet no primeiro registo que a inclua. Não mude o `name` de campos que já têm dados, ou passará a haver duas colunas.

## 5. Testar localmente

Abra `index.html` no navegador. Sem `APPS_SCRIPT_URL` configurado, o site funciona em modo de demonstração: os formulários validam e mostram a confirmação, mas não gravam nada.

## Limites a conhecer

O Google Apps Script gratuito aguenta bem milhares de registos e dezenas de envios por minuto. Se o registo crescer muito (dezenas de milhares de organizações), vale a pena migrar para uma base de dados própria; a estrutura dos formulários em `dados.js` pode ser reaproveitada.
