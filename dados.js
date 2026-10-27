/*
 * Listas e estrutura do formulário de registo.
 * Para acrescentar ou mudar um campo, edite este ficheiro: o formulário,
 * a validação e a coluna na Google Sheet acompanham automaticamente.
 *
 * Tipos de campo: text, email, tel, url, number, select, textarea,
 * checks (várias opções), consent (caixa de confirmação única).
 * Campos com "publico: true" aparecem no diretório (ver também Code.gs).
 * Secções com "mostrarSe" só aparecem quando a opção indicada é marcada.
 */
(function () {
  const PROVINCIAS = [
    "Niassa", "Cabo Delgado", "Nampula", "Zambézia", "Tete", "Manica",
    "Sofala", "Inhambane", "Gaza", "Maputo Província", "Maputo Cidade"
  ];

  const TIPOS_ORGANIZACAO = [
    "Associação", "Fundação", "ONG nacional", "ONG internacional",
    "Organização comunitária de base (OCB)", "Cooperativa",
    "Rede ou plataforma de organizações", "Organização de base religiosa",
    "Sindicato ou associação profissional", "Grupo ou movimento informal", "Outro"
  ];

  const CLASSIFICACOES = [
    "Liderada por mulheres",
    "Liderada por jovens",
    "De base comunitária",
    "Liderada por pessoas com deficiência",
    "Liderada por pessoas que vivem com HIV"
  ];

  const AMBITO = ["Comunitário", "Distrital", "Provincial", "Nacional", "Regional ou internacional"];

  const AREAS = [
    "Agricultura e segurança alimentar", "Ambiente e mudanças climáticas", "Água e saneamento",
    "Criança e adolescência", "Cultura e desporto", "Democracia e governação",
    "Desenvolvimento comunitário", "Direitos humanos", "Educação", "Empoderamento económico",
    "Género e igualdade", "HIV e SIDA", "Juventude", "Paz e coesão social",
    "Pessoas com deficiência", "Pessoas idosas", "Resposta humanitária e emergências",
    "Saúde", "Terra e recursos naturais", "Comunicação e acesso à informação"
  ];

  const AREAS_GENERO = [
    "Violência baseada no género", "Empoderamento económico das mulheres",
    "Saúde sexual e reprodutiva", "Participação política e liderança",
    "Educação da rapariga", "Uniões prematuras", "Direito à terra e à herança",
    "Mulheres com deficiência", "Mulheres rurais", "Paz e segurança"
  ];

  const ORCAMENTO = [
    "Até 500 000 MT", "500 001 a 2 500 000 MT", "2 500 001 a 10 000 000 MT",
    "Acima de 10 000 000 MT", "Prefiro não indicar"
  ];

  const SECCOES = [
    {
      id: "identificacao",
      titulo: "Identificação da organização",
      descricao: "Não precisa de documentos. Indique os dados como a organização é conhecida.",
      campos: [
        { name: "nome", label: "Nome completo da organização", type: "text", required: true, span: 2, maxlength: 200, autocomplete: "organization" },
        { name: "sigla", label: "Sigla", type: "text", maxlength: 30 },
        { name: "tipo_organizacao", label: "Tipo de organização", type: "select", options: TIPOS_ORGANIZACAO, required: true },
        { name: "tipo_outro", label: "Se escolheu Outro, indique qual", type: "text", maxlength: 80 },
        { name: "ano_criacao", label: "Ano de criação", type: "number", min: 1900, max: new Date().getFullYear() }
      ]
    },
    {
      id: "classificacao",
      titulo: "Como a organização se classifica",
      descricao: "Marque todas as que se aplicam. A classificação aparece no diretório e permite que a organização seja encontrada por estes critérios.",
      campos: [
        { name: "classificacao", label: "A organização é…", type: "checks", options: CLASSIFICACOES, span: 2,
          help: "Liderada por mulheres: uma mulher ocupa o cargo mais alto e as mulheres são pelo menos metade da direcção. Liderada por jovens: quem dirige tem até 35 anos." }
      ]
    },
    {
      id: "lideranca",
      titulo: "Liderança feminina",
      descricao: "Estas perguntas aparecem porque marcou “Liderada por mulheres”.",
      mostrarSe: { campo: "classificacao", valor: "Liderada por mulheres" },
      destaque: true,
      campos: [
        { name: "lider_nome", label: "Nome da mulher que dirige a organização", type: "text", required: true, maxlength: 120 },
        { name: "lider_cargo", label: "Cargo", type: "text", required: true, maxlength: 80, placeholder: "Presidente, directora executiva…" },
        { name: "mulheres_direccao", label: "Mulheres no órgão de direcção (%)", type: "number", min: 0, max: 100, required: true },
        { name: "mulheres_membros", label: "Mulheres entre os membros (%)", type: "number", min: 0, max: 100 },
        { name: "fundada_por_mulheres", label: "Foi fundada por mulheres?", type: "select", options: ["Sim", "Não", "Fundação mista"] },
        { name: "foco_mulheres", label: "O trabalho é dirigido sobretudo a mulheres e raparigas?", type: "select",
          options: ["Sim, é o foco principal", "Em parte", "Não"] },
        { name: "areas_genero", label: "Temas de género em que trabalha", type: "checks", options: AREAS_GENERO, span: 2 }
      ]
    },
    {
      id: "localizacao",
      titulo: "Sede e localização",
      campos: [
        { name: "provincia", label: "Província da sede", type: "select", options: PROVINCIAS, required: true },
        { name: "distrito", label: "Distrito da sede", type: "text", required: true, maxlength: 80 },
        { name: "localidade", label: "Posto administrativo, localidade ou bairro", type: "text", maxlength: 120 },
        { name: "ambito", label: "Âmbito de actuação", type: "select", options: AMBITO, required: true },
        { name: "endereco", label: "Endereço da sede", type: "text", span: 2, maxlength: 200, autocomplete: "street-address" }
      ]
    },
    {
      id: "contactos",
      titulo: "Contactos para o público",
      descricao: "Estes contactos aparecem no diretório, para que parceiros e comunidades possam falar com a organização. Use contactos institucionais.",
      destaquePublico: true,
      campos: [
        { name: "telefone_publico", label: "Telefone", type: "tel", required: true, placeholder: "+258 8X XXX XXXX", autocomplete: "tel" },
        { name: "email_publico", label: "Email", type: "email", placeholder: "geral@organizacao.org", autocomplete: "email" },
        { name: "website", label: "Website", type: "url", placeholder: "https://" },
        { name: "redes_sociais", label: "Redes sociais", type: "text", maxlength: 200, placeholder: "Facebook, Instagram, LinkedIn…" },
        { name: "info_contacto", label: "Outras informações de contacto", type: "textarea", span: 2, maxlength: 300,
          help: "Por exemplo: horário de atendimento, WhatsApp, ou como chegar à sede." }
      ]
    },
    {
      id: "responsavel",
      titulo: "Pessoa responsável",
      descricao: "Quem dirige a organização ou pode responder por ela. Estes dados não são publicados; servem para a equipa da Comunidados.",
      campos: [
        { name: "rep_nome", label: "Nome completo", type: "text", required: true, maxlength: 120, autocomplete: "name" },
        { name: "rep_cargo", label: "Cargo na organização", type: "text", required: true, maxlength: 80 },
        { name: "rep_genero", label: "Género", type: "select", options: ["Feminino", "Masculino", "Prefiro não indicar"] },
        { name: "rep_telefone", label: "Telefone", type: "tel", required: true, placeholder: "+258 8X XXX XXXX" },
        { name: "rep_email", label: "Email", type: "email", span: 2 }
      ]
    },
    {
      id: "actuacao",
      titulo: "Missão e áreas de actuação",
      campos: [
        { name: "missao", label: "Missão da organização", type: "textarea", required: true, span: 2, maxlength: 600,
          help: "Em poucas frases: o que a organização faz e para quem. Este texto aparece no diretório." },
        { name: "areas", label: "Áreas de actuação", type: "checks", options: AREAS, required: true, span: 2 },
        { name: "provincias_actuacao", label: "Províncias onde trabalha", type: "checks", options: PROVINCIAS, required: true, span: 2 },
        { name: "publico_alvo", label: "Principais grupos beneficiários", type: "text", span: 2, maxlength: 200,
          placeholder: "Por exemplo: jovens rurais, mulheres agricultoras, crianças órfãs" }
      ]
    },
    {
      id: "capacidade",
      titulo: "Dimensão e recursos",
      descricao: "Valores aproximados ajudam a perceber a escala do trabalho da organização.",
      campos: [
        { name: "membros", label: "Número de membros", type: "number", min: 0 },
        { name: "funcionarios", label: "Funcionários remunerados", type: "number", min: 0 },
        { name: "voluntarios", label: "Voluntários", type: "number", min: 0 },
        { name: "beneficiarios", label: "Beneficiários por ano", type: "number", min: 0 },
        { name: "orcamento", label: "Orçamento anual", type: "select", options: ORCAMENTO, span: 2 },
        { name: "parceiros", label: "Principais parceiros e financiadores", type: "textarea", span: 2, maxlength: 500 }
      ]
    },
    {
      id: "confirmacao",
      titulo: "Confirmação",
      campos: [
        { name: "declaracao", type: "consent", required: true, span: 2,
          label: "Declaro que a informação fornecida é verdadeira e que faço este registo em nome da organização." },
        { name: "consentimento_publicacao", type: "consent", required: true, span: 2,
          label: "Autorizo a publicação imediata no diretório do nome, tipo, classificação, localização, áreas de actuação, missão e contactos para o público." }
      ]
    }
  ];

  window.COMUNIDADOS_DADOS = { PROVINCIAS, AREAS, TIPOS_ORGANIZACAO, CLASSIFICACOES, SECCOES };
})();
