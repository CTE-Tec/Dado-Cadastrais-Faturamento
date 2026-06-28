"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
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
  usarPeriodoPadraoCte: z.boolean().default(true),
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
  documentacaoOutros: z.string().optional(),

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
  usarPeriodoPadraoCte: true,
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
  documentacaoOutros: "",
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
  const [formAlreadyAnswered, setFormAlreadyAnswered] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjError, setCnpjError] = useState("");
  const [cnpjInfoMessage, setCnpjInfoMessage] = useState("");
  const [poDocumentFile, setPoDocumentFile] = useState<File | null>(null);
  const [poDocumentError, setPoDocumentError] = useState("");
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
  const usarPeriodoPadraoCte = watch("usarPeriodoPadraoCte");

  const handlePoDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPoDocumentError("");
    const file = event.target.files?.[0] ?? null;
    setPoDocumentFile(file);
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result.split(",")[1] || "");
        } else {
          reject(new Error("Erro ao ler o arquivo PO."));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo PO."));
      reader.readAsDataURL(file);
    });

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

      // Check if the form has already been answered
      if (perfil?.status_formulario && perfil.status_formulario !== "pendente" && perfil.status_formulario !== "enviado") {
        setFormAlreadyAnswered(true);
        setLoadingClient(false);
        return;
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

      const documentacaoParseada = parseDocumentacaoNecessaria(perfil?.documentacao_necessaria);

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
        usarPeriodoPadraoCte: true,
        janelaMedicaoInicio: perfil?.janela_medicao_inicio ?? 10,
        janelaMedicaoFim: perfil?.janela_medicao_fim ?? 15,
        periodoMedicaoInicio: perfil?.periodo_medicao_inicio ?? 1,
        periodoMedicaoFim: perfil?.periodo_medicao_fim ?? 30,
        hasPurchaseOrder: perfil?.has_purchase_order ?? false,
        poDocumentUrl: perfil?.po_document_url ?? "",
        dataInicioObra: perfil?.data_inicio_obra ?? "",
        dataFimObra: perfil?.data_fim_obra ?? "",
        elaborarContrato: perfil?.elaborar_contrato ?? true,
        documentacaoNecessaria: documentacaoParseada.docsSelecionados,
        documentacaoOutros: documentacaoParseada.outros,
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

      setCnpjInfoMessage("Dados carregados com sucesso a partir da base pública da Receita Federal.");
    } catch (err: any) {
      setCnpjError(err.message || "CNPJ não encontrado ou erro de conexão. Preencha os campos manualmente.");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  // Parse billing days
  const getPrazoVencimentoDias = (data: FormData): number => {
    const numeric = parseInt(data.prazoVencimentoOutro || "", 10);
    return isNaN(numeric) ? 15 : numeric;
  };

  const parseDocumentacaoNecessaria = (value: unknown) => {
    const items = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

    const docsSelecionados = items.filter((item) => docTypes.includes(item));
    const outros = items.filter((item) => !docTypes.includes(item)).filter(Boolean);

    return {
      docsSelecionados,
      outros: outros.join(" | ")
    };
  };

  const buildDocumentacaoNecessariaPayload = (data: FormData) => {
    const docs = [...(data.documentacaoNecessaria || [])];
    const outros = (data.documentacaoOutros || "").trim();

    if (outros) {
      docs.push(outros);
    }

    return docs;
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
        janela_medicao_inicio: data.usarPeriodoPadraoCte ? 1 : data.janelaMedicaoInicio,
        janela_medicao_fim: data.usarPeriodoPadraoCte ? 30 : data.janelaMedicaoFim,
        periodo_medicao_inicio: data.usarPeriodoPadraoCte ? 1 : data.periodoMedicaoInicio,
        periodo_medicao_fim: data.usarPeriodoPadraoCte ? 30 : data.periodoMedicaoFim,
        has_purchase_order: data.hasPurchaseOrder,
        po_document_url: data.poDocumentUrl,
        data_inicio_obra: data.dataInicioObra || null,
        data_fim_obra: data.dataFimObra || null,
        elaborar_contrato: data.elaborarContrato,
        documentacao_necessaria: buildDocumentacaoNecessariaPayload(data),
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

      // Update status_formulario to 'respondido'
      const { error: statusErr } = await supabase
        .from("faturamento_perfis")
        .update({ status_formulario: "respondido" })
        .eq("cliente_id", clientId);

      if (statusErr) {
        console.warn("Erro ao atualizar status_formulario:", statusErr);
      }

      const docsSelecionados = (data.documentacaoNecessaria || []).filter((item): item is string => typeof item === "string");
      const outrosDocumentos = (data.documentacaoOutros || "").trim();
      const shouldSendDocWebhook = data.elaborarContrato && (docsSelecionados.length > 0 || outrosDocumentos.length > 0);
      if (shouldSendDocWebhook) {
        try {
          const docWebhookPayload = {
            cliente_id: clientId,
            email: data.preenchedorEmail || data.contatoCobrancaEmail || "",
            documentos: docsSelecionados,
            outros_documentos: outrosDocumentos
          };

          await fetch("https://n8n.cte.com.br/webhook/5f21b206-4569-4cfd-b54d-ffa4a5dfd546", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(docWebhookPayload)
          });
        } catch (webhookErr) {
          console.warn("Falha ao enviar webhook de documentos:", webhookErr);
        }
      }

      if (data.hasPurchaseOrder) {
        if (!poDocumentFile) {
          setPoDocumentError("Por favor, anexe o documento PO antes de enviar.");
          setSubmitting(false);
          return;
        }

        try {
          const formData = new FormData();
          formData.append("cliente_id", clientId);
          formData.append("email", data.preenchedorEmail || data.contatoCobrancaEmail);
          formData.append("documento", poDocumentFile, poDocumentFile.name);

          const webhookResponse = await fetch("https://n8n.cte.com.br/webhook/d1be8620-ca3c-4258-8044-c465cb44d72f", {
            method: "POST",
            body: formData
          });

          if (!webhookResponse.ok) {
            const webhookText = await webhookResponse.text();
            console.warn("Falha ao enviar webhook do documento PO:", webhookResponse.status, webhookText);
          }
        } catch (webhookErr) {
          console.warn("Falha ao enviar webhook do documento PO:", webhookErr);
        }
      }

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
      fieldsToValidate = ["prazoVencimentoOutro", "janelaMedicaoInicio", "janelaMedicaoFim", "dataInicioObra", "dataFimObra"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setActiveTab(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (submitSuccess || formAlreadyAnswered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl shadow-slate-200/50 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {formAlreadyAnswered ? "Formulário já preenchido" : "Obrigado!"}
          </h2>
          <p className="text-slate-700">
            {formAlreadyAnswered
              ? "Este formulário já foi preenchido e enviado anteriormente. Caso precise fazer alguma alteração, entre em contato com a equipe CTE."
              : "Seus dados cadastrais e de faturamento foram coletados e enviados com sucesso. Agradecemos pela colaboração!"}
          </p>
          <p className="text-sm text-slate-500">
            Em caso de dúvidas, entre em contato pelo e-mail{" "}
            <a href="mailto:adm.sus@cte.com.br" className="text-emerald-600 hover:underline font-medium">adm.sus@cte.com.br</a>
          </p>
        </div>
      </div>
    );
  }

  if (loadingClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (pageBlockedReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 px-4">
        <div className="max-w-xl w-full bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-5 shadow-2xl shadow-rose-200/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-500">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Acesso Bloqueado</h2>
          <p className="text-slate-700 leading-relaxed">{pageBlockedReason}</p>
          <p className="text-sm text-slate-600">Verifique o link enviado ou contate o responsável para receber o acesso correto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-12">
      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
            <Image src="/cte-logo.png" alt="CTE" fill className="object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 uppercase">Centro de Tecnologia de Edificações</h1>
            <p className="text-xs text-slate-600">Formulário de captação de dados</p>
          </div>
        </div>
        {savedLocallyTime && (
          <span className="text-[10px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Autosalvo local às {savedLocallyTime}
          </span>
        )}
      </header>

      <div className="max-w-6xl w-full mx-auto px-4 mt-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="absolute inset-0 opacity-70 saturate-150">
            <Image src="/cte-hero.png" alt="CTE hero" fill className="object-cover" />
            <div className="absolute inset-0 bg-white/70" />
          </div>
          <div className="relative px-6 py-10 md:px-12 md:py-14">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-300/50 bg-emerald-50 px-4 py-2 text-xs uppercase tracking-[0.2em] font-semibold text-emerald-700">
              <div className="relative h-6 w-6 overflow-hidden rounded-md bg-white">
                <Image src="/cte-logo.png" alt="CTE logo" fill className="object-cover" />
              </div>
              <span>Centro de Tecnologia de Edificações</span>
            </div>
            <h1 className="mt-6 text-3xl md:text-4xl font-semibold text-slate-900">Dados Cadastrais e Faturamento</h1>
            <p className="mt-4 max-w-3xl text-sm md:text-base leading-7 text-slate-700">
              Que prazer ter você como nosso cliente! Pensando em iniciar os procedimentos internos, gostaríamos de coletar algumas informações da sua empresa e do projeto para cadastrarmos em sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <main className="max-w-6xl w-full mx-auto px-4 mt-8 flex-grow grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-3">
          <div className="sticky top-24 space-y-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 px-2">Etapas</h2>
            
            <button
              type="button"
              onClick={() => setActiveTab("cadastrais")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition text-left text-sm ${
                activeTab === "cadastrais"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
                  : "hover:bg-slate-100 text-slate-600"
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
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
                  : "hover:bg-slate-100 text-slate-600"
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
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
                  : "hover:bg-slate-100 text-slate-600"
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
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
                  : "hover:bg-slate-100 text-slate-600"
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
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
                  : "hover:bg-slate-100 text-slate-600"
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
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium"
                  : "hover:bg-slate-100 text-slate-600"
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
              <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
                
                {/* Seção 1: Identificação */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <User className="text-emerald-600 w-5 h-5" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seção 1: Identificação</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Informe seu Nome <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Insira seu nome completo"
                        {...register("preenchedorNome")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.preenchedorNome && <p className="text-xs text-rose-500">{errors.preenchedorNome.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Informe seu E-mail <span className="text-rose-500">*</span></label>
                      <input
                        type="email"
                        placeholder="Insira seu e-mail"
                        {...register("preenchedorEmail")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.preenchedorEmail && <p className="text-xs text-rose-500">{errors.preenchedorEmail.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Seção 2: Informações do Empreendimento */}
                <div className="space-y-4 pt-6 border-t border-slate-200/60">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <Building2 className="text-emerald-600 w-5 h-5" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seção 2: Informações do Empreendimento</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Nome do Empreendimento <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Ex: GLP GUARULHOS II"
                        {...register("nomeEmpreendimento")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.nomeEmpreendimento && <p className="text-xs text-rose-500">{errors.nomeEmpreendimento.message}</p>}
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">CNPJ (xx.xxx.xxx/xxxx-xx) <span className="text-rose-500">*</span></label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            placeholder="00.000.000/0000-00"
                            {...register("cnpj")}
                            onChange={(e) => setValue("cnpj", formatCNPJ(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition placeholder-slate-600 text-slate-900 font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCNPJSearch}
                          disabled={loadingCNPJ}
                          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 transition rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/25"
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
                      <label className="text-xs font-semibold text-slate-700">Razão Social <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("razaoSocial")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.razaoSocial && <p className="text-xs text-rose-500">{errors.razaoSocial.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Inscrição Estadual</label>
                      <input
                        type="text"
                        {...register("inscricaoEstadual")}
                        placeholder="Caso seja ISENTO, deixe este campo em branco"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Nome Fantasia</label>
                      <input
                        type="text"
                        {...register("nomeFantasia")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">CEP <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        {...register("cep")}
                        onChange={(e) => setValue("cep", formatCEP(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900 font-mono"
                      />
                      {errors.cep && <p className="text-xs text-rose-500">{errors.cep.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Endereço Completo <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("logradouro")}
                        placeholder="Rua, número, complemento, bairro"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.logradouro && <p className="text-xs text-rose-500">{errors.logradouro.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Número <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("numero")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.numero && <p className="text-xs text-rose-500">{errors.numero.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Complemento</label>
                      <input
                        type="text"
                        {...register("complemento")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Bairro <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        {...register("bairro")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.bairro && <p className="text-xs text-rose-500">{errors.bairro.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Cidade/UF <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Ex: SÃO PAULO/SP"
                        {...register("cidade")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                      {errors.cidade && <p className="text-xs text-rose-500">{errors.cidade.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Estado (UF) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="SP"
                        maxLength={2}
                        {...register("estado")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900 uppercase"
                      />
                      {errors.estado && <p className="text-xs text-rose-500">{errors.estado.message}</p>}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Observação</label>
                      <p className="text-[10px] text-slate-600">Caso ainda não tenha a SPE definida ou por algum motivo não possua os dados cadastrais do empreendimento, por favor utilize este campo para nos alertar dessas possíveis alterações.</p>
                      <textarea
                        rows={2}
                        {...register("observacaoGeral")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => nextTab("cadastrais", "contatos")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-emerald-600/25 text-sm"
                  >
                    Próxima Etapa: Contatos Responsáveis
                  </button>
                </div>
              </div>
            )}

            {/* 2. CONTATOS RESPONSÁVEIS SECTION */}
            {activeTab === "contatos" && (
              <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
                
                {/* Seção 3: Contato Técnico */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <Briefcase className="text-emerald-600 w-5 h-5" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seção 3: Contato Técnico</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Nome do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input type="text" {...register("contatoTecnicoNome")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                      {errors.contatoTecnicoNome && <p className="text-xs text-rose-500">{errors.contatoTecnicoNome.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Cargo do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input type="text" placeholder="Ex: Gerente de Engenharia" {...register("contatoTecnicoCargo")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                      {errors.contatoTecnicoCargo && <p className="text-xs text-rose-500">{errors.contatoTecnicoCargo.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Telefone do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        {...register("contatoTecnicoTelefone")}
                        onChange={(e) => setValue("contatoTecnicoTelefone", formatPhone(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                      />
                      {errors.contatoTecnicoTelefone && <p className="text-xs text-rose-500">{errors.contatoTecnicoTelefone.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">E-mail do Contato Técnico <span className="text-rose-500">*</span></label>
                      <input type="email" {...register("contatoTecnicoEmail")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                      {errors.contatoTecnicoEmail && <p className="text-xs text-rose-500">{errors.contatoTecnicoEmail.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Seção 4: Cobrança (Contato) */}
                <div className="space-y-4 pt-6 border-t border-slate-200/50">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <Mail className="text-emerald-600 w-5 h-5" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seção 4: Cobrança (Contatos)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Nome do Responsável para assuntos de cobrança <span className="text-rose-500">*</span></label>
                      <input type="text" {...register("contatoCobrancaNome")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                      {errors.contatoCobrancaNome && <p className="text-xs text-rose-500">{errors.contatoCobrancaNome.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Telefone para Cobrança <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        {...register("contatoCobrancaTelefone")}
                        onChange={(e) => setValue("contatoCobrancaTelefone", formatPhone(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                      />
                      {errors.contatoCobrancaTelefone && <p className="text-xs text-rose-500">{errors.contatoCobrancaTelefone.message}</p>}
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">E-mail para Cobrança <span className="text-rose-500">*</span></label>
                      <input type="email" {...register("contatoCobrancaEmail")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                      {errors.contatoCobrancaEmail && <p className="text-xs text-rose-500">{errors.contatoCobrancaEmail.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("cadastrais")}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 transition rounded-xl text-slate-700 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("contatos", "faturamento")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-emerald-600/25 text-sm"
                  >
                    Próxima Etapa: Faturamento
                  </button>
                </div>
              </div>
            )}

            {/* 3. DADOS DE FATURAMENTO SECTION */}
            {activeTab === "faturamento" && (
              <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
                
                {/* Seção 4: Cobrança (Endereço e Observações) */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <MapPin className="text-emerald-600 w-5 h-5" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seção 4: Cobrança (Dados de Endereço)</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">O endereço para emissão da cobrança será o mesmo da empresa? *</span>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            checked={cobrancaMesmoEndereco === true}
                            onChange={() => setValue("cobrancaMesmoEndereco", true)}
                            className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                          />
                          <span>Sim</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            checked={cobrancaMesmoEndereco === false}
                            onChange={() => setValue("cobrancaMesmoEndereco", false)}
                            className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                          />
                          <span>Não</span>
                        </label>
                      </div>
                    </div>

                    {!cobrancaMesmoEndereco && (
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-700">Endereço Completo para Cobrança</label>
                          <input type="text" {...register("cobrancaEnderecoCompleto")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">CEP para cobrança</label>
                          <input
                            type="text"
                            placeholder="00000-000"
                            {...register("cobrancaCep")}
                            onChange={(e) => setValue("cobrancaCep", formatCEP(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">Cidade/UF Cobrança</label>
                          <input type="text" placeholder="Ex: SÃO PAULO/SP" {...register("cobrancaCidadeUf")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Observações Adicionais de Cobrança</label>
                      <textarea
                        rows={2}
                        placeholder="Utilize esse espaço para inserir informações adicionais sobre cobrança (ex: CNO)..."
                        {...register("cobrancaObservacoes")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 5: Faturamento */}
                <div className="space-y-4 pt-6 border-t border-slate-200/60">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200">
                    <Calendar className="text-emerald-600 w-5 h-5" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Seção 5: Faturamento (NF)</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block">Prazo para vencimento da cobrança (dias corridos) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ex: 15"
                        {...register("prazoVencimentoOutro")}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-slate-600">Informe a quantidade de dias corridos para o vencimento da cobrança.</p>
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Janela de Recebimento de Medições <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-3 mt-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={usarPeriodoPadraoCte === true}
                            onChange={() => setValue("usarPeriodoPadraoCte", !usarPeriodoPadraoCte)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                          />
                          <span>Seguir padrão da CTE (1 a 30)</span>
                        </label>
                      </div>
                      {!usarPeriodoPadraoCte && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Data de Início</label>
                            <input
                              type="number"
                              placeholder="Dia Início"
                              {...register("janelaMedicaoInicio")}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Data de Fim</label>
                            <input
                              type="number"
                              placeholder="Dia Fim"
                              {...register("janelaMedicaoFim")}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900"
                            />
                          </div>
                        </div>
                      )}
                      {usarPeriodoPadraoCte && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          Os campos serão preenchidos automaticamente com o padrão da CTE: 1 a 30.
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Possui Purchase Order (PO)?</label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            checked={hasPO === true}
                            onChange={() => setValue("hasPurchaseOrder", true)}
                            className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                          />
                          <span>Sim</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            checked={hasPO === false}
                            onChange={() => {
                              setValue("hasPurchaseOrder", false);
                              setPoDocumentFile(null);
                              setPoDocumentError("");
                            }}
                            className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                          />
                          <span>Não</span>
                        </label>
                      </div>
                    </div>

                    {hasPO && (
                      <div className="col-span-1 md:col-span-2 border border-dashed border-emerald-200 bg-slate-50 p-5 rounded-2xl space-y-3">
                        <label className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                          <Upload className="w-4 h-4" /> Anexar Documento PO <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={handlePoDocumentChange}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                        />
                        {poDocumentFile && (
                          <p className="text-xs text-slate-600">Arquivo selecionado: {poDocumentFile.name}</p>
                        )}
                        {poDocumentError && <p className="text-xs text-rose-500">{poDocumentError}</p>}
                        <p className="text-[10px] text-slate-500">Obrigatório quando o PO for necessário. Caso não tenha PO, apenas selecione "Não" na pergunta anterior.</p>
                      </div>
                    )}

                    {/* Faturamento com dados diferentes? */}
                    <div className="col-span-1 md:col-span-2 border-t border-slate-200/60 pt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Os dados cadastrais a constar na Nota Fiscal serão os mesmos da empresa? *</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              checked={faturamentoMesmosDados === true}
                              onChange={() => setValue("faturamentoMesmosDados", true)}
                              className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                            />
                            <span>Sim</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              checked={faturamentoMesmosDados === false}
                              onChange={() => setValue("faturamentoMesmosDados", false)}
                              className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>

                      {!faturamentoMesmosDados && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Razão Social para Faturamento</label>
                            <input type="text" {...register("faturamentoRazaoSocial")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">CNPJ de Faturamento</label>
                            <input
                              type="text"
                              placeholder="00.000.000/0000-00"
                              {...register("faturamentoCnpj")}
                              onChange={(e) => setValue("faturamentoCnpj", formatCNPJ(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Inscrição Estadual Faturamento</label>
                            <input type="text" placeholder="Caso seja ISENTO, deixe este campo em branco" {...register("faturamentoInscricaoEstadual")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">CEP Faturamento</label>
                            <input
                              type="text"
                              placeholder="00000-000"
                              {...register("faturamentoCep")}
                              onChange={(e) => setValue("faturamentoCep", formatCEP(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Cidade/UF Faturamento</label>
                            <input type="text" placeholder="Ex: SÃO PAULO/SP" {...register("faturamentoCidadeUf")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700">Endereço de Faturamento</label>
                            <input type="text" {...register("faturamentoEndereco")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Informações adicionais na descrição da Nota Fiscal</label>
                        <textarea
                          rows={2}
                          placeholder="Número do Pedido, CNO, Dados Bancários, Endereço da Obra..."
                          {...register("faturamentoObsNf")}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("contatos")}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 transition rounded-xl text-slate-700 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("faturamento", "contrato")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-emerald-600/25 text-sm"
                  >
                    Próxima Etapa: Contrato
                  </button>
                </div>
              </div>
            )}

            {/* 4. CONTRATO & DOCUMENTOS SECTION */}
            {activeTab === "contrato" && (
              <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
                  <FileText className="text-emerald-600 w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Seção 6: Contrato de Prestação de Serviços</h3>
                    <p className="text-xs text-slate-600">Indique os trâmites contratuais e envie os documentos solicitados</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Para o projeto fechado com o CTE será elaborado um contrato de prestação de serviços? *</label>
                    <p className="text-xs text-slate-600">Gostaríamos de informar que, na ausência de um contrato formalizado entre as partes, seguiremos com as condições comerciais previstas na proposta comercial que lhe foi apresentada.</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value="true"
                          checked={watch("elaborarContrato") === true}
                          onChange={() => setValue("elaborarContrato", true)}
                          className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                        />
                        <span>Sim</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value="false"
                          checked={watch("elaborarContrato") === false}
                          onChange={() => setValue("elaborarContrato", false)}
                          className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                        />
                        <span>Não, seguiremos com a proposta comercial</span>
                      </label>
                    </div>
                  </div>

                  {watch("elaborarContrato") === true && (
                    <div className="space-y-3 pt-4 border-t border-slate-200/65">
                      <label className="text-sm font-semibold text-slate-700 block">Gostaria que enviássemos algum documento para os trâmites jurídicos ou cadastrais da sua empresa?</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {docTypes.map((doc) => (
                          <label key={doc} className="flex items-start space-x-3 text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition">
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
                              className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200 mt-0.5"
                            />
                            <span>{doc}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-semibold text-slate-700 block">Outros documentos (descreva)</label>
                        <input
                          type="text"
                          value={watch("documentacaoOutros") || ""}
                          onChange={(e) => setValue("documentacaoOutros", e.target.value)}
                          placeholder="Descreva outros documentos a serem enviados"
                          className="mt-2 w-full rounded bg-slate-50 border border-slate-200 text-sm px-3 py-2 text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("faturamento")}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 transition rounded-xl text-slate-700 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("contrato", "art")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-emerald-600/25 text-sm"
                  >
                    Próxima Etapa: ART
                  </button>
                </div>
              </div>
            )}

            {/* 5. EMISSÃO DE ART SECTION */}
            {activeTab === "art" && (
              <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
                  <Sparkles className="text-emerald-600 w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Seção 7: Emissão da ART</h3>
                    <p className="text-xs text-slate-600">Coleta de dados da obra para emissão da Anotação de Responsabilidade Técnica</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">Gostaríamos de confirmar se será necessária a emissão de Anotação de Responsabilidade Técnica (ART) para o serviço que foi contratado. *</label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value="true"
                          checked={necessitaArt === true}
                          onChange={() => setValue("necessitaArt", true)}
                          className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                        />
                        <span>Sim</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value="false"
                          checked={necessitaArt === false}
                          onChange={() => setValue("necessitaArt", false)}
                          className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                        />
                        <span>Não</span>
                      </label>
                    </div>
                  </div>

                  {necessitaArt && (
                    <div className="space-y-6 border-t border-slate-200/60 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Os dados da empresa para emissão da ART serão os mesmos? *</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              checked={artMesmosDados === true}
                              onChange={() => setValue("artMesmosDados", true)}
                              className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                            />
                            <span>Sim</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              checked={artMesmosDados === false}
                              onChange={() => setValue("artMesmosDados", false)}
                              className="text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200"
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>

                      {!artMesmosDados && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Razão Social - ART</label>
                            <input type="text" {...register("artRazaoSocial")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">CNPJ - ART</label>
                            <input
                              type="text"
                              placeholder="Preencher somente números e sem pontuação"
                              {...register("artCnpj")}
                              onChange={(e) => setValue("artCnpj", formatCNPJ(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">CEP - ART</label>
                            <input
                              type="text"
                              placeholder="Preencher somente números e sem pontuação"
                              {...register("artCep")}
                              onChange={(e) => setValue("artCep", formatCEP(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Cidade/UF - ART</label>
                            <input type="text" {...register("artCidadeUf")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700">Endereço da Empresa - ART</label>
                            <input type="text" {...register("artEndereco")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 border-t border-slate-200/40 pt-5">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dados Específicos da Obra</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700">Endereço da Obra</label>
                            <input type="text" {...register("artEnderecoObra")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">CEP da Obra</label>
                            <input
                              type="text"
                              placeholder="Preencher somente números e sem pontuação"
                              {...register("artCepObra")}
                              onChange={(e) => setValue("artCepObra", formatCEP(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Cidade / Estado da Obra</label>
                            <input type="text" {...register("artCidadeEstadoObra")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Área total construída (m²) *</label>
                            <input type="number" step="any" {...register("artAreaConstruida")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Data de Início da Obra <span className="text-rose-500">*</span></label>
                            <input
                              type="date"
                              {...register("dataInicioObra")}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Data de Término da Obra <span className="text-rose-500">*</span></label>
                            <input
                              type="date"
                              {...register("dataFimObra")}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Finalidade da Obra *</label>
                            <select {...register("artFinalidadeObra")} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900">
                              {finalidadesObra.map((f) => (
                                <option key={f} value={f} className="bg-slate-50 text-slate-900">{f}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-1 md:col-span-2 mt-2">
                            <label className="flex items-start space-x-3 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                {...register("artAutorizacaoArt")}
                                className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-50 border-slate-200 mt-0.5"
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
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 transition rounded-xl text-slate-700 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => nextTab("art", "feedback")}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition duration-200 rounded-xl font-medium shadow-lg shadow-emerald-600/25 text-sm"
                  >
                    Próxima Etapa: Finalizar
                  </button>
                </div>
              </div>
            )}

            {/* 6. FEEDBACK SECTION */}
            {activeTab === "feedback" && (
              <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
                  <CheckCircle2 className="text-emerald-600 w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Seção 8: Feedback Final</h3>
                    <p className="text-xs text-slate-600">De 0 a 10, que nota daria ao uso dessa ferramenta para coleta de dados?</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block text-center">Deixe um feedback ao nosso time *</label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setValue("feedbackNota", num)}
                          className={`w-10 h-10 md:w-11 md:h-11 rounded-xl text-sm font-bold flex items-center justify-center transition border ${
                            watch("feedbackNota") === num
                              ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-700"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between px-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      <span>Péssimo</span>
                      <span>Excelente</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Pronto para enviar!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ao clicar em "Confirmar e Enviar", todas os seus dados cadastrais, contatos, dados de faturamento e preferências contratuais serão salvos no banco.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("art")}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 transition rounded-xl text-slate-700 text-sm font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:from-emerald-700 active:to-teal-600 text-white rounded-xl font-bold shadow-xl shadow-emerald-600/30 text-sm transition duration-200 flex items-center space-x-2"
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

