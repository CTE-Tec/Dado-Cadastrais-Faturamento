-- Migration for Client Registration and Billing Flow - V3 (Excel Parity + Identification)

-- 1. Create Clientes Table
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  nome_empreendimento TEXT, -- Excel: Nome do Empreendimento
  inscricao_estadual TEXT,
  observacao_geral TEXT, -- Excel: Observação
  
  -- Seção 1: IDENTIFICAÇÃO (Quem preenche o formulário)
  preenchedor_nome TEXT,
  preenchedor_email TEXT,

  -- Address info
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Excel: Contato Técnico
  contato_tecnico_nome TEXT,
  contato_tecnico_cargo TEXT,
  contato_tecnico_telefone TEXT,
  contato_tecnico_email TEXT,

  -- Excel: Contato Cobrança
  contato_cobranca_nome TEXT,
  contato_cobranca_telefone TEXT,
  contato_cobranca_email TEXT,
  
  projeto_id UUID, -- reference to public.projetos(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);

-- 2. Create Faturamento Perfis Table
CREATE TABLE IF NOT EXISTS public.faturamento_perfis (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  projeto_id UUID, -- reference to public.projetos(id)
  
  -- Invoicing (Endereço de Cobrança)
  cobranca_mesmo_endereco BOOLEAN DEFAULT TRUE,
  cobranca_endereco_completo TEXT,
  cobranca_cep TEXT,
  cobranca_cidade_uf TEXT,
  cobranca_observacoes TEXT, -- Excel: Observações Adicionais de Cobrança

  -- Faturamento fields
  prazo_vencimento_dias INTEGER,
  janela_medicao_inicio INTEGER,
  janela_medicao_fim INTEGER,
  periodo_medicao_inicio INTEGER DEFAULT 1,
  periodo_medicao_fim INTEGER DEFAULT 30,
  has_purchase_order BOOLEAN DEFAULT FALSE,
  po_document_url TEXT,
  data_inicio_obra DATE,
  data_fim_obra DATE,
  
  -- Contrato de Prestação de Serviços
  elaborar_contrato BOOLEAN DEFAULT TRUE,
  documentacao_necessaria TEXT[], -- array of options selected: Cartão CNPJ, Contrato Social, etc.
  
  -- Dados Faturamento especificos (if different from general business info)
  faturamento_mesmos_dados BOOLEAN DEFAULT TRUE,
  faturamento_razao_social TEXT,
  faturamento_cnpj TEXT,
  faturamento_inscricao_estadual TEXT,
  faturamento_endereco TEXT,
  faturamento_cep TEXT,
  faturamento_cidade_uf TEXT,
  faturamento_obs_nf TEXT, -- Excel: Informações adicionais na descrição da Nota Fiscal
  
  -- Emissão da ART fields
  necessita_art BOOLEAN DEFAULT FALSE,
  art_mesmos_dados BOOLEAN DEFAULT TRUE,
  art_razao_social TEXT,
  art_cnpj TEXT,
  art_endereco TEXT,
  art_cep TEXT,
  art_cidade_uf TEXT,
  art_endereco_obra TEXT,
  art_cep_obra TEXT,
  art_cidade_estado_obra TEXT,
  art_area_construida NUMERIC(15, 2),
  art_finalidade_obra TEXT, -- Residencial, Comercial, Logístico, etc.
  art_autorizacao_art BOOLEAN DEFAULT FALSE,
  
  -- Feedback
  feedback_nota INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT faturamento_perfis_pkey PRIMARY KEY (id)
);

-- 3. Add column references back to projects if necessary, or check existing
ALTER TABLE public.clientes ADD CONSTRAINT fk_clientes_projeto FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE SET NULL;
ALTER TABLE public.faturamento_perfis ADD CONSTRAINT fk_faturamento_projeto FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_perfis ENABLE ROW LEVEL SECURITY;

-- 5. Create Public Policies (As requested: temporary public read/write)
CREATE POLICY "Permitir leitura pública de clientes" ON public.clientes FOR SELECT USING (TRUE);
CREATE POLICY "Permitir inserção pública de clientes" ON public.clientes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Permitir update público de clientes" ON public.clientes FOR UPDATE USING (TRUE);

CREATE POLICY "Permitir leitura pública de faturamento_perfis" ON public.faturamento_perfis FOR SELECT USING (TRUE);
CREATE POLICY "Permitir inserção pública de faturamento_perfis" ON public.faturamento_perfis FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Permitir update público de faturamento_perfis" ON public.faturamento_perfis FOR UPDATE USING (TRUE);

-- 6. Trigger for updated_at
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_faturamento_perfis_updated_at BEFORE UPDATE ON public.faturamento_perfis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
