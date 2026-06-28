-- Add status_formulario column to faturamento_perfis
-- Possible values: 'pendente', 'enviado', 'respondido'
ALTER TABLE public.faturamento_perfis 
  ADD COLUMN IF NOT EXISTS status_formulario TEXT DEFAULT 'pendente';

-- Optional: Add a check constraint to ensure valid values
ALTER TABLE public.faturamento_perfis 
  ADD CONSTRAINT chk_status_formulario 
  CHECK (status_formulario IN ('pendente', 'enviado', 'respondido'));
