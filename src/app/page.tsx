"use client";

import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { formatCNPJ, formatPhone, formatCEP } from "@/lib/masks";
import { 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  Phone as PhoneIcon, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Upload, 
  Sparkles,
  Search,
  AlertTriangle,
  Briefcase,
  Lock
} from "lucide-react";

// Zod validation schema matching Excel fields + Identification filler details
const formSchema = z.object({
  // Seção 1: IDENTIFICAÇÃO (Quem preenche o formulário)
  preenchedorNome: z.string().min(3, "Nome completo obrigatório"),
  preenchedorEmail: z.string().email("E-mail inválido").min(5, "E-mail obrigatório"),

  // Seção 2: Informações do Empreendimento
  cnpj: z.string().min(18, "CNPJ inválido (deve ter 14 dígitos)"),
  razaoSocial: z.string().min(3, "Razão Social obrigatória"),
  nomeFantasia: z.string().optional(),
  nomeEmpreendimento: z.string().min(2, "Nome do Empreendimento obrigatório"),
  inscricaoEstadual: z.string().optional(),
  observacaoGeral: z.string().optional(),
  cep: z.string().min(9, "CEP obrigatório"),
  logradouro: z.string().min(3, "Logradouro obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  estado: z.string().length(2, "Estado obrigatório (UF de 2 letras)"),

  // Seção 3: Contato Técnico
  contatoTecnicoNome: z.string().min(3, "Nome do contato técnico obrigatório"),
  contatoTecnicoCargo: z.string().min(2, "Cargo do contato técnico obrigatório"),
  contatoTecnicoTelefone: z.string().min(14, "Telefone técnico obrigatório"),
  contatoTecnicoEmail: z.string().email("E-mail técnico inválido").min(5, "E-mail técnico obrigatório"),

  // Seção 4: Cobrança (Contato)
  contatoCobrancaNome: z.string().min(3, "Nome do contato de cobrança obrigatório"),
  contatoCobrancaTelefone: z.string().min(14, "Telefone de cobrança obrigatório"),
  contatoCobrancaEmail: z.string().email("E-mail de cobrança inválido").min(5, "E-mail de cobrança obrigatório"),

  // Seção 4: Cobrança (Endereço)
  cobrancaMesmoEndereco: z.boolean().default(true),
  cobrancaEnderecoCompleto: z.string().optional(),
  cobrancaCep: z.string().optional(),
  cobrancaCidadeUf: z.string().optional(),
  cobrancaObservacoes: z.string().optional(),

  // Seção 5: Faturamento (Cobrança e NF)
  prazoVencimentoOpcao: z.string().default("15 dias corridos"),
  prazoVencimentoOutro: z.string().optional(),
  janelaMedicaoInicio: z.coerce.number().min(1).max(31, "Dia de início inválido"),
  janelaMedicaoFim: z.coerce.number().min(1).max(31, "Dia de fim inválido"),
  periodoMedicaoInicio: z.coerce.number().min(1).max(31, "Dia de início inválido").default(1),
  periodoMedicaoFim: z.coerce.number().min(1).max(31, "Dia de fim inválido").default(30),
  hasPurchaseOrder: z.boolean().default(false),
  poDocumentUrl: z.string().optional(),
  dataInicioObra: z.string().min(1, "Data de início da obra obrigatória"),
  dataFimObra: z.string().min(1, "Data de término da obra obrigatória"),

  // Seção 5: Faturamento (NF)
  faturamentoMesmosDados: z.boolean().default(true),
  faturamentoRazaoSocial: z.string().optional(),
  faturamentoCnpj: z.string().optional(),
  faturamentoInscricaoEstadual: z.string().optional(),
  faturamentoEndereco: z.string().optional(),
  faturamentoCep: z.string().optional(),
  faturamentoCidadeUf: z.string().optional(),
  faturamentoObsNf: z.string().optional(),

  // Seção 6: Contrato
  elaborarContrato: z.boolean().default(true),
  documentacaoNecessaria: z.array(z.string()).default([]),

  // Seção 7: Emissão da ART
  necessitaArt: z.boolean().default(false),
  artMesmosDados: z.boolean().default(true),
  artRazaoSocial: z.string().optional(),
  artCnpj: z.string().optional(),
  artEndereco: z.string().optional(),
  artCep: z.string().optional(),
  artCidadeUf: z.string().optional(),
  artEnderecoObra: z.string().optional(),
  artCepObra: z.string().optional(),
  artCidadeEstadoObra: z.string().optional(),
  artAreaConstruida: z.coerce.number().optional(),
  artFinalidadeObra: z.string().optional(),
  artAutorizacaoArt: z.boolean().default(false),

  // Seção 8: Feedback
  feedbackNota: z.coerce.number().min(0).max(10).optional(),
});

type FormData = z.infer<typeof formSchema>;

const defaultFormValues: FormData = {
  preenchedorNome: "",
  preenchedorEmail: "",
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  nomeEmpreendimento: "",
  inscricaoEstadual: "",
  observacaoGeral: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  contatoTecnicoNome: "",
  contatoTecnicoCargo: "",
  contatoTecnicoTelefone: "",
  contatoTecnicoEmail: "",
  contatoCobrancaNome: "",
  contatoCobrancaTelefone: "",
  contatoCobrancaEmail: "",
  cobrancaMesmoEndereco: true,
  cobrancaEnderecoCompleto: "",
  cobrancaCep: "",
  cobrancaCidadeUf: "",
  cobrancaObservacoes: "",
  prazoVencimentoOpcao: "15 dias corridos",
  prazoVencimentoOutro: "",
  janelaMedicaoInicio: 10,
  janelaMedicaoFim: 15,
  periodoMedicaoInicio: 1,
  periodoMedicaoFim: 30,
  hasPurchaseOrder: false,
  poDocumentUrl: "",
  dataInicioObra: "",
  dataFimObra: "",
  elaborarContrato: true,
  documentacaoNecessaria: [],
  faturamentoMesmosDados: true,
  faturamentoRazaoSocial: "",
  faturamentoCnpj: "",
  faturamentoInscricaoEstadual: "",
  faturamentoEndereco: "",
  faturamentoCep: "",
  faturamentoCidadeUf: "",
  faturamentoObsNf: "",
  necessitaArt: false,
  artMesmosDados: true,
  artRazaoSocial: "",
  artCnpj: "",
  artEndereco: "",
  artCep: "",
  artCidadeUf: "",
  artEnderecoObra: "",
  artCepObra: "",
  artCidadeEstadoObra: "",
  artAreaConstruida: 0,
  artFinalidadeObra: "Comercial",
  artAutorizacaoArt: false,
  feedbackNota: undefined
};

const docTypes = [
  "Cartão CNPJ",
  "Contrato Social",
  "Inscrição Estadual",
  "Inscrição Municipal",
  "QSA (Quadro de Sócios e Administradores)",
  "RG / CPF do Responsável Legal",
  "CREA do Responsável Técnico",
  "CND Federal",
  "CND Estadual",
  "CND Municipal",
  "CREA PJ",
  "Comprovante Bancário"
];

const finalidadesObra = [
  "Residencial",
  "Comercial",
  "Logístico",
  "Industrial",
  "Cultural",
  "Escolar",
  "Esportivo",
  "Hoteleiro",
  "Saúde",
  "Outra"
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [clientIdParam, setClientIdParam] = useState<string | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [pageBlockedReason, setPageBlockedReason] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjError, setCnpjError] = useState("");
  const [cnpjInfoMessage, setCnpjInfoMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"cadastrais" | "contatos" | "faturamento" | "contrato" | "art" | "feedback">("cadastrais");
  const [savedLocallyTime, setSavedLocallyTime] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    trigger,
    formState: { errors, isDirty }
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues
  });

  const watchAllFields = useWatch({ control });
  const hasPO = watch("hasPurchaseOrder");
  const cobrancaMesmoEndereco = watch("cobrancaMesmoEndereco");
  const faturamentoMesmosDados = watch("faturamentoMesmosDados");
  const necessitaArt = watch("necessitaArt");
  const artMesmosDados = watch("artMesmosDados");
  const cnpjValue = watch("cnpj");
  const prazoVencimentoOpcao = watch("prazoVencimentoOpcao");

  // Prevent Hydration Errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load client and profile by id param, block page if invalid or not found
  useEffect(() => {
    if (!mounted) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    const idParam = params.get("id");

    if (!idParam) {
      setPageBlockedReason("Link inválido: parâmetro id ausente.");
      setLoadingClient(false);
      return;
    }

    const clientIdString = idParam;
    setClientIdParam(clientIdString);

    const loadClient = async () => {
      setLoadingClient(true);
      setPageBlockedReason(null);

      const { data: cliente, error: clienteErr } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clientIdString)
        .single();

      if (clienteErr || !cliente) {
        const errorMessage = clienteErr?.message || "Cliente não encontrado. Verifique se o link está correto.";
        console.error("Cliente fetch error:", clienteErr, clientIdString);
        setPageBlockedReason(errorMessage);
        setLoadingClient(false);
        return;
      }

      const { data: perfil, error: perfilErr } = await supabase
        .from("faturamento_perfis")
        .select("*")
        .eq("cliente_id", clientIdString)
        .maybeSingle();

      if (perfilErr) {
        console.warn("Perfil fetch warning:", perfilErr, clientIdString);
      }

      const buildOption = (days: number | null | undefined): { option: string; other: string } => {
        if (!days) {
          return { option: "15 dias corridos", other: "" };
        }
        const mapped = [10, 15, 20, 30].includes(days)
          ? `${days} dias corridos`
          : "Outra";
        return {
          option: mapped,
          other: mapped === "Outra" ? String(days) : ""
        };
      };

      const prazoSettings = buildOption(perfil?.prazo_vencimento_dias ?? null);

      const resetValues = {
        ...defaultFormValues,
        preenchedorNome: cliente.preenchedor_nome ?? "",
        preenchedorEmail: cliente.preenchedor_email ?? "",
        cnpj: cliente.cnpj ? formatCNPJ(cliente.cnpj) : "",
        razaoSocial: cliente.razao_social ?? "",
        nomeFantasia: cliente.nome_fantasia ?? "",
        nomeEmpreendimento: cliente.nome_empreendimento ?? "",
        inscricaoEstadual: cliente.inscricao_estadual ?? "",
        observacaoGeral: cliente.observacao_geral ?? "",
        cep: cliente.cep ? formatCEP(cliente.cep) : "",
        logradouro: cliente.logradouro ?? "",
        numero: cliente.numero ?? "",
        complemento: cliente.complemento ?? "",
        bairro: cliente.bairro ?? "",
        cidade: cliente.cidade ?? "",
        estado: cliente.estado ?? "",
        contatoTecnicoNome: cliente.contato_tecnico_nome ?? "",
        contatoTecnicoCargo: cliente.contato_tecnico_cargo ?? "",
        contatoTecnicoTelefone: cliente.contato_tecnico_telefone ? formatPhone(cliente.contato_tecnico_telefone) : "",
        contatoTecnicoEmail: cliente.contato_tecnico_email ?? "",
        contatoCobrancaNome: cliente.contato_cobranca_nome ?? "",
        contatoCobrancaTelefone: cliente.contato_cobranca_telefone ? formatPhone(cliente.contato_cobranca_telefone) : "",
        contatoCobrancaEmail: cliente.contato_cobranca_email ?? "",
        cobrancaMesmoEndereco: perfil?.cobranca_mesmo_endereco ?? true,
        cobrancaEnderecoCompleto: perfil?.cobranca_endereco_completo ?? "",
        cobrancaCep: perfil?.cobranca_cep ? formatCEP(perfil.cobranca_cep) : "",
        cobrancaCidadeUf: perfil?.cobranca_cidade_uf ?? "",
        cobrancaObservacoes: perfil?.cobranca_observacoes ?? "",
        prazoVencimentoOpcao: prazoSettings.option,
        prazoVencimentoOutro: prazoSettings.other,
        janelaMedicaoInicio: perfil?.janela_medicao_inicio ?? 10,
        janelaMedicaoFim: perfil?.janela_medicao_fim ?? 15,
        periodoMedicaoInicio: perfil?.periodo_medicao_inicio ?? 1,
        periodoMedicaoFim: perfil?.periodo_medicao_fim ?? 30,
        hasPurchaseOrder: perfil?.has_purchase_order ?? false,
        poDocumentUrl: perfil?.po_document_url ?? "",
        dataInicioObra: perfil?.data_inicio_obra ?? "",
        dataFimObra: perfil?.data_fim_obra ?? "",
        elaborarContrato: perfil?.elaborar_contrato ?? true,
        documentacaoNecessaria: perfil?.documentacao_necessaria ?? [],
        faturamentoMesmosDados: perfil?.faturamento_mesmos_dados ?? true,
        faturamentoRazaoSocial: perfil?.faturamento_razao_social ?? "",
        faturamentoCnpj: perfil?.faturamento_cnpj ? formatCNPJ(perfil.faturamento_cnpj) : "",
        faturamentoInscricaoEstadual: perfil?.faturamento_inscricao_estadual ?? "",
        faturamentoEndereco: perfil?.faturamento_endereco ?? "",
        faturamentoCep: perfil?.faturamento_cep ? formatCEP(perfil.faturamento_cep) : "",
        faturamentoCidadeUf: perfil?.faturamento_cidade_uf ?? "",
        faturamentoObsNf: perfil?.faturamento_obs_nf ?? "",
        necessitaArt: perfil?.necessita_art ?? false,
        artMesmosDados: perfil?.art_mesmos_dados ?? true,
        artRazaoSocial: perfil?.art_razao_social ?? "",
        artCnpj: perfil?.art_cnpj ? formatCNPJ(perfil.art_cnpj) : "",
        artEndereco: perfil?.art_endereco ?? "",
        artCep: perfil?.art_cep ? formatCEP(perfil.art_cep) : "",
        artCidadeUf: perfil?.art_cidade_uf ?? "",
        artEnderecoObra: perfil?.art_endereco_obra ?? "",
        artCepObra: perfil?.art_cep_obra ? formatCEP(perfil.art_cep_obra) : "",
        artCidadeEstadoObra: perfil?.art_cidade_estado_obra ?? "",
        artAreaConstruida: perfil?.art_area_construida ?? 0,
        artFinalidadeObra: perfil?.art_finalidade_obra ?? "Comercial",
        artAutorizacaoArt: perfil?.art_autorizacao_art ?? false,
        feedbackNota: perfil?.feedback_nota ?? undefined
      };

      if (typeof window !== "undefined" && clientIdString) {
        const savedKey = `form_state_general_v3_${clientIdString}`;
        const saved = localStorage.getItem(savedKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const isDefaultSavedState = Object.keys(defaultFormValues).every((key) => {
              const k = key as keyof FormData;
              return parsed[k] === undefined || parsed[k] === defaultFormValues[k];
            });

            if (!isDefaultSavedState) {
              Object.assign(resetValues, parsed);
              setSavedLocallyTime(new Date().toLocaleTimeString());
            }
          } catch (e) {
            console.error("Error parsing local storage form state", e);
          }
        }
      }

      reset(resetValues);

      setClientId(clientIdString);
      setLoadingClient(false);
    };

    loadClient();
  }, [mounted, reset]);

  // Autosave to localStorage on any input change
  useEffect(() => {
    if (!mounted || !clientId) return;
    const timer = setTimeout(() => {
      if (Object.keys(watchAllFields).length > 0) {
        localStorage.setItem(`form_state_general_v3_${clientId}`, JSON.stringify(watchAllFields));
        setSavedLocallyTime(new Date().toLocaleTimeString());
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [watchAllFields, mounted, clientId]);

  // Handle CNPJ lookup manually via Button
  const handleCNPJSearch = async () => {
    const cleanCnpj = (cnpjValue || "").replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      setCnpjError("Digite um CNPJ válido com 14 dígitos.");
      return;
    }

    setLoadingCNPJ(true);
    setCnpjError("");
    setCnpjInfoMessage("");

    const maxRetries = 3;
    const baseDelay = 1500; // ms

    const fetchWithRetry = async (cnpj: string): Promise<any> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
          
          if (res.status === 429) {
            if (attempt === maxRetries) {
              throw new Error("Limite de requisições da API pública excedido. Tente preencher manualmente ou clique em buscar novamente em alguns instantes.");
            }
            const delay = baseDelay * attempt;
            setCnpjInfoMessage(`Muitas requisições. Reconfigurando e tentando novamente em ${delay / 1000}s (Tentativa ${attempt} de ${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          if (!res.ok) {
            throw new Error("CNPJ não encontrado na base pública.");
          }

          return await res.json();
        } catch (err: any) {
          if (attempt === maxRetries || err.message === "CNPJ não encontrado na base pública.") {
            throw err;
          }
          const delay = baseDelay * attempt;
          setCnpjInfoMessage(`Erro de conexão. Tentando novamente em ${delay / 1000}s (Tentativa ${attempt} de ${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    try {
      const data = await fetchWithRetry(cleanCnpj);
      
      setValue("razaoSocial", data.razao_social || "");
      setValue("nomeFantasia", data.nome_fantasia || data.razao_social || "");
      setValue("logradouro", `${data.logradouro_tipo || ""} ${data.logradouro || ""}`.trim());
      setValue("numero", data.numero || "");
      setValue("complemento", data.complemento || "");
      setValue("bairro", data.bairro || "");
      setValue("cep", formatCEP(data.cep || ""));
      setValue("cidade", data.municipio || "");
      setValue("estado", data.uf || "");
      
      if (data.ddd_telefone_1) {
        setValue("contatoTecnicoTelefone", formatPhone(data.ddd_telefone_1));
        setValue("contatoCobrancaTelefone", formatPhone(data.ddd_telefone_1));
      }
      if (data.email) {
        setValue("contatoTecnicoEmail", data.email);
        setValue("contatoCobrancaEmail", data.email);
      }

      setCnpjInfoMessage("Dados carregados com sucesso!");
    } catch (err: any) {
      setCnpjError(err.message || "CNPJ não encontrado ou erro de conexão. Preencha os campos manualmente.");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  // Parse billing days
  const getPrazoVencimentoDias = (data: FormData): number => {
    if (data.prazoVencimentoOpcao === "Outra") {
      const numeric = parseInt(data.prazoVencimentoOutro || "", 10);
      return isNaN(numeric) ? 15 : numeric;
    }
    const val = parseInt(data.prazoVencimentoOpcao.split(" ")[0], 10);
    return isNaN(val) ? 15 : val;
  };

  // Handle submission
  const onSubmit = async (data: FormData) => {
    if (!clientId) {
      alert("Cliente não identificado. Atualize a página e tente novamente.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update existing Client
      const { error: clientErr } = await supabase
        .from("clientes")
        .update({
          cnpj: data.cnpj.replace(/\D/g, ""),
          razao_social: data.razaoSocial,
          nome_fantasia: data.nomeFantasia,
          nome_empreendimento: data.nomeEmpreendimento,
          inscricao_estadual: data.inscricaoEstadual,
          observacao_geral: data.observacaoGeral,
          preenchedor_nome: data.preenchedorNome,
          preenchedor_email: data.preenchedorEmail,
          cep: data.cep.replace(/\D/g, ""),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          contato_tecnico_nome: data.contatoTecnicoNome,
          contato_tecnico_cargo: data.contatoTecnicoCargo,
          contato_tecnico_telefone: data.contatoTecnicoTelefone.replace(/\D/g, ""),
          contato_tecnico_email: data.contatoTecnicoEmail,
          contato_cobranca_nome: data.contatoCobrancaNome,
          contato_cobranca_telefone: data.contatoCobrancaTelefone.replace(/\D/g, ""),
          contato_cobranca_email: data.contatoCobrancaEmail
        })
        .eq("id", clientId);

      if (clientErr) throw clientErr;

      // Calculate deadline days
      const prazoDias = getPrazoVencimentoDias(data);

      // 2. Update or insert Billing Profile for the existing client
      const { data: existingProfile, error: existingProfileErr } = await supabase
        .from("faturamento_perfis")
        .select("id")
        .eq("cliente_id", clientId)
        .maybeSingle();

      if (existingProfileErr) {
        throw existingProfileErr;
      }

      const profilePayload = {
        cliente_id: clientId,
        cobranca_mesmo_endereco: data.cobrancaMesmoEndereco,
        cobranca_endereco_completo: data.cobrancaEnderecoCompleto,
        cobranca_cep: data.cobrancaCep ? data.cobrancaCep.replace(/\D/g, "") : null,
        cobranca_cidade_uf: data.cobrancaCidadeUf,
        cobranca_observacoes: data.cobrancaObservacoes,
        prazo_vencimento_dias: prazoDias,
        janela_medicao_inicio: data.janelaMedicaoInicio,
        janela_medicao_fim: data.janelaMedicaoFim,
        periodo_medicao_inicio: data.periodoMedicaoInicio,
        periodo_medicao_fim: data.periodoMedicaoFim,
        has_purchase_order: data.hasPurchaseOrder,
        po_document_url: data.poDocumentUrl,
        data_inicio_obra: data.dataInicioObra || null,
        data_fim_obra: data.dataFimObra || null,
        elaborar_contrato: data.elaborarContrato,
        documentacao_necessaria: data.documentacaoNecessaria,
        faturamento_mesmos_dados: data.faturamentoMesmosDados,
        faturamento_razao_social: data.faturamentoRazaoSocial,
        faturamento_cnpj: data.faturamentoCnpj ? data.faturamentoCnpj.replace(/\D/g, "") : null,
        faturamento_inscricao_estadual: data.faturamentoInscricaoEstadual,
        faturamento_endereco: data.faturamentoEndereco,
        faturamento_cep: data.faturamentoCep ? data.faturamentoCep.replace(/\D/g, "") : null,
        faturamento_cidade_uf: data.faturamentoCidadeUf,
        faturamento_obs_nf: data.faturamentoObsNf,
        necessita_art: data.necessitaArt,
        art_mesmos_dados: data.artMesmosDados,
        art_razao_social: data.artRazaoSocial,
        art_cnpj: data.artCnpj ? data.artCnpj.replace(/\D/g, "") : null,
        art_endereco: data.artEndereco,
        art_cep: data.artCep ? data.artCep.replace(/\D/g, "") : null,
        art_cidade_uf: data.artCidadeUf,
        art_endereco_obra: data.artEnderecoObra,
        art_cep_obra: data.artCepObra ? data.artCepObra.replace(/\D/g, "") : null,
        art_cidade_estado_obra: data.artCidadeEstadoObra,
        art_area_construida: data.artAreaConstruida || null,
        art_finalidade_obra: data.artFinalidadeObra,
        art_autorizacao_art: data.artAutorizacaoArt,
        feedback_nota: data.feedbackNota || null
      };

      let billingErr;
      if (existingProfile?.id) {
        const { error } = await supabase
          .from("faturamento_perfis")
          .update(profilePayload)
          .eq("id", existingProfile.id);
        billingErr = error;
      } else {
        const { error } = await supabase
          .from("faturamento_perfis")
          .insert(profilePayload);
        billingErr = error;
      }

      if (billingErr) throw billingErr;

      if (clientId) {
        localStorage.removeItem(`form_state_general_v3_${clientId}`);
      }
      setSubmitSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao enviar as informações. Verifique os dados ou tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const nextTab = async (currentTab: typeof activeTab, next: typeof activeTab) => {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (currentTab === "cadastrais") {
      fieldsToValidate = ["preenchedorNome", "preenchedorEmail", "cnpj", "razaoSocial", "nomeEmpreendimento", "cep", "logradouro", "numero", "bairro", "cidade", "estado"];
    } else if (currentTab === "contatos") {
      fieldsToValidate = [
        "contatoTecnicoNome", "contatoTecnicoCargo", "contatoTecnicoTelefone", "contatoTecnicoEmail",
        "contatoCobrancaNome", "contatoCobrancaTelefone", "contatoCobrancaEmail"
      ];
    } else if (currentTab === "faturamento") {
      fieldsToValidate = ["prazoVencimentoOpcao", "prazoVencimentoOutro", "janelaMedicaoInicio", "janelaMedicaoFim", "dataInicioObra", "dataFimObra"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setActiveTab(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white px-4">
        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-indigo-500/20 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-500/10 border-2 border-indigo-500 rounded-full flex items-center justify-center mx-auto text-indigo-400">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Obrigado!</h2>
          <p className="text-slate-300">
            Seus dados cadastrais e de faturamento foram coletados e enviados com sucesso.
          </p>
          <div className="pt-4">
            <button
              onClick={() => {
                setSubmitSuccess(false);
                window.location.reload();
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-indigo-600/20 text-sm"
            >
              Preencher Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (pageBlockedReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-xl w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl shadow-rose-500/10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Acesso Bloqueado</h2>
          <p className="text-slate-300 leading-relaxed">{pageBlockedReason}</p>
          <p className="text-sm text-slate-500">Verifique o link enviado ou contate o responsável para receber o acesso correto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col font-sans pb-12">
      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            CTE
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white uppercase">Dados Cadastrais & Faturamento</h1>
            <p className="text-xs text-slate-400">Formulário de Captação</p>
          </div>
        </div>
        {savedLocallyTime && (
          <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-700/30">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Autosalvo local às {savedLocallyTime}
          </span>
        )}
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-6xl w-full mx-auto px-4 mt-8 flex-grow grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-3">
          <div className="sticky top-24 space-y-2 bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 px-2">Etapas</h2>
            
            <button
              type="button"
              onClick={() => setActiveTab("cadastrais")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "cadastrais"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-medium"
                  : "hover:bg-slate-800/40 text-slate-400"
              }`}
            >
              <Building2 className="w-4.5 h-4.5" />
              <span>Dados Cadastrais</span>
            </button>

            <button
              type="button"
              onClick={() => nextTab("cadastrais", "contatos")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "contatos"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-medium"
                  : "hover:bg-slate-800/40 text-slate-400"
              }`}
            >
              <User className="w-4.5 h-4.5" />
              <span>Contatos Responsáveis</span>
            </button>
            
            <button
              type="button"
              onClick={() => nextTab("contatos", "faturamento")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "faturamento"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-medium"
                  : "hover:bg-slate-800/40 text-slate-400"
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Faturamento</span>
            </button>

            <button
              type="button"
              onClick={() => nextTab("faturamento", "contrato")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "contrato"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-medium"
                  : "hover:bg-slate-800/40 text-slate-400"
              }`}
            >
              <FileText className="w-4.5 h-4.5" />
              <span>Contrato & Documentos</span>
            </button>

            <button
              type="button"
              onClick={() => nextTab("contrato", "art")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "art"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-medium"
                  : "hover:bg-slate-800/40 text-slate-400"
              }`}
            >
              <Sparkles className="w-4.5 h-4.5" />
              <span>Emissão de ART</span>
            </button>

            <button
              type="button"
              onClick={() => nextTab("art", "feedback")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "feedback"
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 font-medium"
                  : "hover:bg-slate-800/40 text-slate-400"
              }`}
            >
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span>Feedback final</span>
            </button>
          </div>
        </aside>

        {/* Form Container */}
        <section className="lg:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* 1. DADOS CADASTRAIS SECTION */}
            {activeTab === "cadastrais" && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6">
                
                {/* Seção 1: Identificação */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                    <User className="text-indigo-400 w-5 h-5" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seção 1: Identificação</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Informe seu Nome <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Insira seu nome completo"
                        {...register("preenchedorNome")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.preenchedorNome && <p className="text-xs text-rose-500">{errors.preenchedorNome.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Informe seu E-mail <span className="text-rose-500">*</span></label>
                      <input
                        type="email"
                        placeholder="Insira seu e-mail"
                        {...register("preenchedorEmail")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.preenchedorEmail && <p className="text-xs text-rose-500">{errors.preenchedorEmail.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Seção 2: Informações do Empreendimento */}
                <div className="space-y-4 pt-6 border-t border-slate-800/60">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                    <Building2 className="text-indigo-400 w-5 h-5" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seção 2: Informações do Empreendimento</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300">Nome do Empreendimento <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Ex: GLP GUARULHOS II"
                        {...register("nomeEmpreendimento")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.nomeEmpreendimento && <p className="text-xs text-rose-500">{errors.nomeEmpreendimento.message}</p>}
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300">CNPJ (xx.xxx.xxx/xxxx-xx) <span className="text-rose-500">*</span></label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            placeholder="00.000.000/0000-00"
                            {...register("cnpj")}
                            onChange={(e) => setValue("cnpj", formatCNPJ(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition placeholder-slate-600 text-white font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCNPJSearch}
                          disabled={loadingCNPJ}
                          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 transition rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                        >
                          {loadingCNPJ ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          <span>Buscar</span>
                        </button>
                      </div>
                      {cnpjInfoMessage && <p className="text-xs text-emerald-400">{cnpjInfoMessage}</p>}
                      {cnpjError && (
                        <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-400 mt-1">
                          <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                          <span>{cnpjError}</span>
                        </div>
                      )}
                      {errors.cnpj && <p className="text-xs text-rose-500">{errors.cnpj.message}</p>}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300">Razão Social <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("razaoSocial")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.razaoSocial && <p className="text-xs text-rose-500">{errors.razaoSocial.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Inscrição Estadual</label>
                      <input
                        type="text"
                        {...register("inscricaoEstadual")}
                        placeholder="Caso seja ISENTO, deixe este campo em branco"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Nome Fantasia</label>
                      <input
                        type="text"
                        {...register("nomeFantasia")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">CEP <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        {...register("cep")}
                        onChange={(e) => setValue("cep", formatCEP(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white font-mono"
                      />
                      {errors.cep && <p className="text-xs text-rose-500">{errors.cep.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Endereço Completo <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("logradouro")}
                        placeholder="Rua, número, complemento, bairro"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.logradouro && <p className="text-xs text-rose-500">{errors.logradouro.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Número <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("numero")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.numero && <p className="text-xs text-rose-500">{errors.numero.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Complemento</label>
                      <input
                        type="text"
                        {...register("complemento")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Bairro <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("bairro")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.bairro && <p className="text-xs text-rose-500">{errors.bairro.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Cidade/UF <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Ex: SÃO PAULO/SP"
                        {...register("cidade")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                      {errors.cidade && <p className="text-xs text-rose-500">{errors.cidade.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Estado (UF) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="SP"
                        maxLength={2}
                        {...register("estado")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white uppercase"
                      />
                      {errors.estado && <p className="text-xs text-rose-500">{errors.estado.message}</p>}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300">Observação</label>
                      <p className="text-[10px] text-slate-500">Caso ainda não tenha a SPE definida ou por algum motivo não possua os dados cadastrais do empreendimento, por favor utilize este campo para nos alertar dessas possíveis alterações.</p>
                      <textarea
                        rows={2}
                        {...register("observacaoGeral")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => nextTab("cadastrais", "contatos")}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-indigo-600/25 text-sm"
                  >
                    Próxima Etapa: Contatos Responsáveis
                  </button>
                </div>
              </div>
            )}

            {/* 2. CONTATOS RESPONSÁVEIS SECTION */}
            {activeTab === "contatos" && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6">
                
                {/* Seção 3: Contato Técnico */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                    <Briefcase className="text-indigo-400 w-5 h-5" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seção 3: Contato Técnico</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-850/50">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Nome do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input type="text" {...register("contatoTecnicoNome")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      {errors.contatoTecnicoNome && <p className="text-xs text-rose-500">{errors.contatoTecnicoNome.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Cargo do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input type="text" placeholder="Ex: Gerente de Engenharia" {...register("contatoTecnicoCargo")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      {errors.contatoTecnicoCargo && <p className="text-xs text-rose-500">{errors.contatoTecnicoCargo.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Telefone do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        {...register("contatoTecnicoTelefone")}
                        onChange={(e) => setValue("contatoTecnicoTelefone", formatPhone(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                      />
                      {errors.contatoTecnicoTelefone && <p className="text-xs text-rose-500">{errors.contatoTecnicoTelefone.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">E-mail do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input type="email" {...register("contatoTecnicoEmail")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      {errors.contatoTecnicoEmail && <p className="text-xs text-rose-500">{errors.contatoTecnicoEmail.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Seção 4: Cobrança (Contato) */}
                <div className="space-y-4 pt-6 border-t border-slate-800/50">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                    <Mail className="text-indigo-400 w-5 h-5" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seção 4: Cobrança (Contatos)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-850/50">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Nome do Responsável para assuntos de cobrança <span className="text-rose-500">*</span></label>
                      <input type="text" {...register("contatoCobrancaNome")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      {errors.contatoCobrancaNome && <p className="text-xs text-rose-500">{errors.contatoCobrancaNome.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Telefone para Cobrança <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        {...register("contatoCobrancaTelefone")}
                        onChange={(e) => setValue("contatoCobrancaTelefone", formatPhone(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                      />
                      {errors.contatoCobrancaTelefone && <p className="text-xs text-rose-500">{errors.contatoCobrancaTelefone.message}</p>}
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300">E-mail para Cobrança <span className="text-rose-500">*</span></label>
                      <input type="email" {...register("contatoCobrancaEmail")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                      {errors.contatoCobrancaEmail && <p className="text-xs text-rose-500">{errors.contatoCobrancaEmail.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("cadastrais")}
                    className="px-6 py-3 border border-slate-800 hover:bg-slate-800/40 transition rounded-xl text-slate-300 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("contatos", "faturamento")}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-indigo-600/25 text-sm"
                  >
                    Próxima Etapa: Faturamento
                  </button>
                </div>
              </div>
            )}

            {/* 3. DADOS DE FATURAMENTO SECTION */}
            {activeTab === "faturamento" && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6">
                
                {/* Seção 4: Cobrança (Endereço e Observações) */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                    <MapPin className="text-indigo-400 w-5 h-5" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seção 4: Cobrança (Dados de Endereço)</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">O endereço para emissão da cobrança será o mesmo da empresa? *</span>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            checked={cobrancaMesmoEndereco === true}
                            onChange={() => setValue("cobrancaMesmoEndereco", true)}
                            className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                          />
                          <span>Sim</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            checked={cobrancaMesmoEndereco === false}
                            onChange={() => setValue("cobrancaMesmoEndereco", false)}
                            className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                          />
                          <span>Não</span>
                        </label>
                      </div>
                    </div>

                    {!cobrancaMesmoEndereco && (
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-300">Endereço Completo para Cobrança</label>
                          <input type="text" {...register("cobrancaEnderecoCompleto")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-300">CEP para cobrança</label>
                          <input
                            type="text"
                            placeholder="00000-000"
                            {...register("cobrancaCep")}
                            onChange={(e) => setValue("cobrancaCep", formatCEP(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-300">Cidade/UF Cobrança</label>
                          <input type="text" placeholder="Ex: SÃO PAULO/SP" {...register("cobrancaCidadeUf")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Observações Adicionais de Cobrança</label>
                      <textarea
                        rows={2}
                        placeholder="Utilize esse espaço para inserir informações adicionais sobre cobrança (ex: CNO)..."
                        {...register("cobrancaObservacoes")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 5: Faturamento */}
                <div className="space-y-4 pt-6 border-t border-slate-800/60">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                    <Calendar className="text-indigo-400 w-5 h-5" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seção 5: Faturamento (NF)</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 block">Prazo para vencimento da cobrança? <span className="text-rose-500">*</span></label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {["10 dias corridos", "15 dias corridos", "20 dias corridos", "30 dias corridos", "Outra"].map((opt) => (
                          <label key={opt} className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                            prazoVencimentoOpcao === opt
                              ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}>
                            <input
                              type="radio"
                              value={opt}
                              checked={prazoVencimentoOpcao === opt}
                              onChange={() => setValue("prazoVencimentoOpcao", opt)}
                              className="sr-only"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      
                      {prazoVencimentoOpcao === "Outra" && (
                        <div className="mt-2 space-y-1">
                          <input
                            type="number"
                            placeholder="Insira a quantidade de dias (ex: 45)"
                            {...register("prazoVencimentoOutro")}
                            className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Janela de Recebimento de Medições <span className="text-rose-500">*</span></label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Dia Início (Ex: 10)"
                          {...register("janelaMedicaoInicio")}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                        <input
                          type="number"
                          placeholder="Dia Fim (Ex: 15)"
                          {...register("janelaMedicaoFim")}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Período de Medição Padrão</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          {...register("periodoMedicaoInicio")}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                        <input
                          type="number"
                          {...register("periodoMedicaoFim")}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Possui Purchase Order (PO)?</label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            checked={hasPO === true}
                            onChange={() => setValue("hasPurchaseOrder", true)}
                            className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                          />
                          <span>Sim</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            checked={hasPO === false}
                            onChange={() => setValue("hasPurchaseOrder", false)}
                            className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                          />
                          <span>Não</span>
                        </label>
                      </div>
                    </div>

                    {hasPO && (
                      <div className="col-span-1 md:col-span-2 border border-dashed border-indigo-500/20 bg-indigo-950/10 p-5 rounded-2xl space-y-2">
                        <label className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                          <Upload className="w-4 h-4" /> Anexar Documento PO
                        </label>
                        <input
                          type="text"
                          placeholder="Link ou caminho do documento PO (ou anexe após confirmação)"
                          {...register("poDocumentUrl")}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Data de Início da Obra <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        {...register("dataInicioObra")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Data de Término da Obra <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        {...register("dataFimObra")}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                      />
                    </div>

                    {/* Faturamento com dados diferentes? */}
                    <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Os dados cadastrais a constar na Nota Fiscal serão os mesmos da empresa? *</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              checked={faturamentoMesmosDados === true}
                              onChange={() => setValue("faturamentoMesmosDados", true)}
                              className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                            />
                            <span>Sim</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              checked={faturamentoMesmosDados === false}
                              onChange={() => setValue("faturamentoMesmosDados", false)}
                              className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>

                      {!faturamentoMesmosDados && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Razão Social para Faturamento</label>
                            <input type="text" {...register("faturamentoRazaoSocial")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">CNPJ de Faturamento</label>
                            <input
                              type="text"
                              placeholder="00.000.000/0000-00"
                              {...register("faturamentoCnpj")}
                              onChange={(e) => setValue("faturamentoCnpj", formatCNPJ(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Inscrição Estadual Faturamento</label>
                            <input type="text" placeholder="Caso seja ISENTO, deixe este campo em branco" {...register("faturamentoInscricaoEstadual")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">CEP Faturamento</label>
                            <input
                              type="text"
                              placeholder="00000-000"
                              {...register("faturamentoCep")}
                              onChange={(e) => setValue("faturamentoCep", formatCEP(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Cidade/UF Faturamento</label>
                            <input type="text" placeholder="Ex: SÃO PAULO/SP" {...register("faturamentoCidadeUf")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-300">Endereço de Faturamento</label>
                            <input type="text" {...register("faturamentoEndereco")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">Informações adicionais na descrição da Nota Fiscal</label>
                        <textarea
                          rows={2}
                          placeholder="Número do Pedido, CNO, Dados Bancários, Endereço da Obra..."
                          {...register("faturamentoObsNf")}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("contatos")}
                    className="px-6 py-3 border border-slate-800 hover:bg-slate-800/40 transition rounded-xl text-slate-300 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("faturamento", "contrato")}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-indigo-600/25 text-sm"
                  >
                    Próxima Etapa: Contrato
                  </button>
                </div>
              </div>
            )}

            {/* 4. CONTRATO & DOCUMENTOS SECTION */}
            {activeTab === "contrato" && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
                  <FileText className="text-indigo-400 w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Seção 6: Contrato de Prestação de Serviços</h3>
                    <p className="text-xs text-slate-400">Indique os trâmites contratuais e envie os documentos solicitados</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 block">Para o projeto fechado com o CTE será elaborado um contrato de prestação de serviços? *</label>
                    <p className="text-xs text-slate-500">Gostaríamos de informar que, na ausência de um contrato formalizado entre as partes, seguiremos com as condições comerciais previstas na proposta comercial que lhe foi apresentada.</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          value="true"
                          checked={watch("elaborarContrato") === true}
                          onChange={() => setValue("elaborarContrato", true)}
                          className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                        />
                        <span>Sim</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          value="false"
                          checked={watch("elaborarContrato") === false}
                          onChange={() => setValue("elaborarContrato", false)}
                          className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                        />
                        <span>Não, seguiremos com a proposta comercial</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800/65">
                    <label className="text-sm font-semibold text-slate-300 block">Gostaria que enviássemos algum documento para os trâmites jurídicos ou cadastrais da sua empresa?</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {docTypes.map((doc) => (
                        <label key={doc} className="flex items-start space-x-3 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition">
                          <input
                            type="checkbox"
                            value={doc}
                            checked={(watch("documentacaoNecessaria") || []).includes(doc)}
                            onChange={(e) => {
                              const currentDocs = watch("documentacaoNecessaria") || [];
                              if (e.target.checked) {
                                setValue("documentacaoNecessaria", [...currentDocs, doc]);
                              } else {
                                setValue("documentacaoNecessaria", currentDocs.filter(d => d !== doc));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800 mt-0.5"
                          />
                          <span>{doc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("faturamento")}
                    className="px-6 py-3 border border-slate-800 hover:bg-slate-800/40 transition rounded-xl text-slate-300 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("contrato", "art")}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-indigo-600/25 text-sm"
                  >
                    Próxima Etapa: ART
                  </button>
                </div>
              </div>
            )}

            {/* 5. EMISSÃO DE ART SECTION */}
            {activeTab === "art" && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
                  <Sparkles className="text-indigo-400 w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Seção 7: Emissão da ART</h3>
                    <p className="text-xs text-slate-400">Coleta de dados da obra para emissão da Anotação de Responsabilidade Técnica</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 block">Gostaríamos de confirmar se será necessária a emissão de Anotação de Responsabilidade Técnica (ART) para o serviço que foi contratado. *</label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          value="true"
                          checked={necessitaArt === true}
                          onChange={() => setValue("necessitaArt", true)}
                          className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                        />
                        <span>Sim</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          value="false"
                          checked={necessitaArt === false}
                          onChange={() => setValue("necessitaArt", false)}
                          className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                        />
                        <span>Não</span>
                      </label>
                    </div>
                  </div>

                  {necessitaArt && (
                    <div className="space-y-6 border-t border-slate-800/60 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Os dados da empresa para emissão da ART serão os mesmos? *</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              checked={artMesmosDados === true}
                              onChange={() => setValue("artMesmosDados", true)}
                              className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                            />
                            <span>Sim</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              checked={artMesmosDados === false}
                              onChange={() => setValue("artMesmosDados", false)}
                              className="text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>

                      {!artMesmosDados && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Razão Social - ART</label>
                            <input type="text" {...register("artRazaoSocial")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">CNPJ - ART</label>
                            <input
                              type="text"
                              placeholder="Preencher somente números e sem pontuação"
                              {...register("artCnpj")}
                              onChange={(e) => setValue("artCnpj", formatCNPJ(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">CEP - ART</label>
                            <input
                              type="text"
                              placeholder="Preencher somente números e sem pontuação"
                              {...register("artCep")}
                              onChange={(e) => setValue("artCep", formatCEP(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Cidade/UF - ART</label>
                            <input type="text" {...register("artCidadeUf")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-300">Endereço da Empresa - ART</label>
                            <input type="text" {...register("artEndereco")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 border-t border-slate-800/40 pt-5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados Específicos da Obra</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-300">Endereço da Obra</label>
                            <input type="text" {...register("artEnderecoObra")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">CEP da Obra</label>
                            <input
                              type="text"
                              placeholder="Preencher somente números e sem pontuação"
                              {...register("artCepObra")}
                              onChange={(e) => setValue("artCepObra", formatCEP(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Cidade / Estado da Obra</label>
                            <input type="text" {...register("artCidadeEstadoObra")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Área total construída (m²) *</label>
                            <input type="number" step="any" {...register("artAreaConstruida")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Finalidade da Obra *</label>
                            <select {...register("artFinalidadeObra")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white">
                              {finalidadesObra.map((f) => (
                                <option key={f} value={f} className="bg-slate-950 text-white">{f}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-1 md:col-span-2 mt-2">
                            <label className="flex items-start space-x-3 text-xs text-slate-400 cursor-pointer">
                              <input
                                type="checkbox"
                                {...register("artAutorizacaoArt")}
                                className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800 mt-0.5"
                              />
                              <span>Declaro que autorizo a emissão da Anotação de Responsabilidade Técnica (ART) com base nas informações preenchidas nesta seção do formulário. *</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("contrato")}
                    className="px-6 py-3 border border-slate-800 hover:bg-slate-800/40 transition rounded-xl text-slate-300 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("art", "feedback")}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-indigo-600/25 text-sm"
                  >
                    Próxima Etapa: Finalizar
                  </button>
                </div>
              </div>
            )}

            {/* 6. FEEDBACK SECTION */}
            {activeTab === "feedback" && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
                  <CheckCircle2 className="text-indigo-400 w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Seção 8: Feedback Final</h3>
                    <p className="text-xs text-slate-400">De 0 a 10, que nota daria ao uso dessa ferramenta para coleta de dados?</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 block text-center">Deixe um feedback ao nosso time *</label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setValue("feedbackNota", num)}
                          className={`w-10 h-10 md:w-11 md:h-11 rounded-xl text-sm font-bold flex items-center justify-center transition border ${
                            watch("feedbackNota") === num
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between px-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>Péssimo</span>
                      <span>Excelente</span>
                    </div>
                  </div>

                  <div className="bg-indigo-950/20 border border-indigo-500/15 p-5 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Pronto para enviar!
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ao clicar em "Confirmar e Enviar", todas os seus dados cadastrais, contatos, dados de faturamento e preferências contratuais serão salvos no banco.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("art")}
                    className="px-6 py-3 border border-slate-800 hover:bg-slate-800/40 transition rounded-xl text-slate-300 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:from-indigo-700 active:to-purple-700 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/30 text-sm transition duration-200 flex items-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Confirmar e Enviar</span>
                    )}
                  </button>
                </div>
              </div>
            )}
            
          </form>
        </section>

      </main>
    </div>
  );
}
