'use client'

import { useState, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Brain, Cpu, Zap, Download, ExternalLink, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Loader2, Play, FileText, Settings,
  Database, BarChart3, Layers, Terminal, Sparkles, Info, Copy,
  Check, Upload, RefreshCw, Globe, BookOpen, Code2, FlaskConical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelConfig {
  id: string
  name: string
  hf_id: string
  family: string
  params: string
  vram_gb: number
  context_length: number
  supports_lora: boolean
  supports_qlora: boolean
  supports_full_ft: boolean
  tags: string[]
  description: string
  license: string
  use_cases: string[]
}

interface TrainingConfig {
  model: ModelConfig | null
  method: 'lora' | 'qlora' | 'full_ft'
  task_type: 'causal_lm' | 'seq2seq' | 'classification' | 'regression'
  dataset_format: 'alpaca' | 'sharegpt' | 'raw_text' | 'csv' | 'jsonl'
  epochs: number
  batch_size: number
  learning_rate: number
  max_seq_length: number
  lora_r: number
  lora_alpha: number
  lora_dropout: number
  lora_target_modules: string
  warmup_ratio: number
  lr_scheduler: string
  fp16: boolean
  bf16: boolean
  gradient_checkpointing: boolean
  save_steps: number
  eval_steps: number
  output_dir: string
  push_to_hub: boolean
  hub_model_id: string
  use_wandb: boolean
  wandb_project: string
  quantization_bits: 4 | 8 | null
  gradient_accumulation_steps: number
  weight_decay: number
  max_grad_norm: number
}

type Platform = 'colab' | 'jupyter' | 'runpod' | 'kaggle' | 'local'
type Tab = 'models' | 'config' | 'notebook' | 'deploy'

// ─── Model Registry ───────────────────────────────────────────────────────────

const MODEL_REGISTRY: ModelConfig[] = [
  // Llama family
  {
    id: 'llama-3.1-8b', name: 'Llama 3.1 8B', hf_id: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    family: 'Llama 3', params: '8B', vram_gb: 16, context_length: 131072,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['instruction', 'chat', 'general'], license: 'Llama 3',
    description: 'Meta\'s best small model. Excellent instruction following, great for fine-tuning.',
    use_cases: ['Chatbot', 'Code assistant', 'RAG', 'Classification']
  },
  {
    id: 'llama-3.1-70b', name: 'Llama 3.1 70B', hf_id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    family: 'Llama 3', params: '70B', vram_gb: 80, context_length: 131072,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['instruction', 'chat', 'powerful'], license: 'Llama 3',
    description: 'Flagship open model. Near GPT-4 quality. Needs A100 80GB or 2xA40.',
    use_cases: ['Complex reasoning', 'Advanced RAG', 'Summarization']
  },
  // Mistral family
  {
    id: 'mistral-7b', name: 'Mistral 7B v0.3', hf_id: 'mistralai/Mistral-7B-Instruct-v0.3',
    family: 'Mistral', params: '7B', vram_gb: 14, context_length: 32768,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['instruction', 'fast', 'efficient'], license: 'Apache 2.0',
    description: 'Best-in-class 7B model. Apache 2.0 license — fully commercial.',
    use_cases: ['Production deployment', 'Edge', 'Summarization', 'Q&A']
  },
  {
    id: 'mixtral-8x7b', name: 'Mixtral 8x7B MoE', hf_id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    family: 'Mistral', params: '47B (MoE)', vram_gb: 48, context_length: 32768,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['moe', 'powerful', 'efficient'], license: 'Apache 2.0',
    description: 'Mixture-of-Experts. Activates only 12.9B params per token. Extremely capable.',
    use_cases: ['Complex tasks', 'Multilingual', 'Code generation']
  },
  // Qwen family
  {
    id: 'qwen2.5-7b', name: 'Qwen 2.5 7B', hf_id: 'Qwen/Qwen2.5-7B-Instruct',
    family: 'Qwen', params: '7B', vram_gb: 14, context_length: 131072,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['instruction', 'multilingual', 'code'], license: 'Apache 2.0',
    description: 'Alibaba\'s best small model. Exceptional for code and multilingual tasks.',
    use_cases: ['Code', 'Math', 'Multilingual', 'Long context']
  },
  {
    id: 'qwen2.5-14b', name: 'Qwen 2.5 14B', hf_id: 'Qwen/Qwen2.5-14B-Instruct',
    family: 'Qwen', params: '14B', vram_gb: 28, context_length: 131072,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['powerful', 'code', 'math'], license: 'Apache 2.0',
    description: 'Outperforms many 70B models on code/math benchmarks.',
    use_cases: ['Advanced code', 'Mathematical reasoning', 'Long context']
  },
  // Phi family
  {
    id: 'phi-3.5-mini', name: 'Phi-3.5 Mini', hf_id: 'microsoft/Phi-3.5-mini-instruct',
    family: 'Phi', params: '3.8B', vram_gb: 8, context_length: 128000,
    supports_lora: true, supports_qlora: true, supports_full_ft: true,
    tags: ['tiny', 'edge', 'fast'], license: 'MIT',
    description: 'Microsoft\'s tiny powerhouse. Runs on consumer GPUs (8GB VRAM).',
    use_cases: ['Edge deployment', 'Mobile', 'Low-latency', 'Prototyping']
  },
  // Gemma family
  {
    id: 'gemma-2-9b', name: 'Gemma 2 9B', hf_id: 'google/gemma-2-9b-it',
    family: 'Gemma', params: '9B', vram_gb: 18, context_length: 8192,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['google', 'instruction', 'safety'], license: 'Gemma Terms',
    description: 'Google\'s open model with strong safety alignment. Great general-purpose model.',
    use_cases: ['Safe deployment', 'Consumer apps', 'Summarization']
  },
  // Code models
  {
    id: 'deepseek-coder-7b', name: 'DeepSeek Coder V2', hf_id: 'deepseek-ai/deepseek-coder-7b-instruct-v1.5',
    family: 'DeepSeek', params: '7B', vram_gb: 14, context_length: 16384,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['code', 'specialized', 'programming'], license: 'DeepSeek License',
    description: 'Best open-source code model. Trained on 2T code tokens.',
    use_cases: ['Code generation', 'Code review', 'Debugging', 'Documentation']
  },
  {
    id: 'codellama-7b', name: 'Code Llama 7B', hf_id: 'meta-llama/CodeLlama-7b-Instruct-hf',
    family: 'Llama', params: '7B', vram_gb: 14, context_length: 16384,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['code', 'llama', 'infilling'], license: 'Llama 2',
    description: 'Meta\'s code-specialized model. Supports infilling and 80+ languages.',
    use_cases: ['Code completion', 'Code explanation', 'Bug fixing']
  },
  // Specialized
  {
    id: 'falcon-7b', name: 'Falcon 7B', hf_id: 'tiiuae/falcon-7b-instruct',
    family: 'Falcon', params: '7B', vram_gb: 14, context_length: 2048,
    supports_lora: true, supports_qlora: true, supports_full_ft: false,
    tags: ['apache', 'commercial', 'fast'], license: 'Apache 2.0',
    description: 'TII\'s fully open-source model. No restrictions, fully commercial.',
    use_cases: ['Commercial products', 'Customer service', 'Content']
  },
]

const FAMILIES = ['All', 'Llama 3', 'Mistral', 'Qwen', 'Phi', 'Gemma', 'DeepSeek', 'Llama', 'Falcon']

// ─── Notebook Generators ──────────────────────────────────────────────────────

function generateColabNotebook(config: TrainingConfig): object {
  const { model, method, task_type, dataset_format, epochs, batch_size,
    learning_rate, max_seq_length, lora_r, lora_alpha, lora_dropout,
    lora_target_modules, warmup_ratio, lr_scheduler, fp16, bf16,
    gradient_checkpointing, save_steps, eval_steps, output_dir,
    push_to_hub, hub_model_id, use_wandb, wandb_project,
    quantization_bits, gradient_accumulation_steps, weight_decay, max_grad_norm } = config

  const modelId = model?.hf_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct'
  const isQLoRA = method === 'qlora'
  const isLoRA = method === 'lora' || method === 'qlora'

  const cells = [
    // Cell 1: Title
    {
      cell_type: 'markdown', metadata: {}, source: [
        `# 🚀 Fine-Tuning: ${model?.name || 'Custom Model'}\n`,
        `**Method**: ${method.toUpperCase()} | **Task**: ${task_type} | **Platform**: Google Colab\n\n`,
        `> Generated by System2ML — The AI Pipeline Design Platform\n\n`,
        `## Setup Instructions\n`,
        `1. **Runtime**: Go to \`Runtime → Change runtime type → T4 GPU\`\n`,
        `2. **Secrets** (if private model): Add \`HF_TOKEN\` in Secrets panel 🔑\n`,
        `3. **Run all cells** in order\n\n`,
        `| Setting | Value |\n|---------|-------|\n`,
        `| Model | \`${modelId}\` |\n`,
        `| Method | ${method.toUpperCase()} |\n`,
        `| VRAM Required | ~${model?.vram_gb || 16}GB |\n`,
        `| Epochs | ${epochs} |\n`,
        `| Batch Size | ${batch_size} |\n`,
        `| Learning Rate | ${learning_rate} |\n`,
      ]
    },
    // Cell 2: Install
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 📦 Install Dependencies { display-mode: "form" }\n',
        '# This installs all required packages for fine-tuning\n',
        '!pip install -q --upgrade pip\n',
        '!pip install -q transformers==4.44.0\n',
        '!pip install -q datasets==2.20.0\n',
        '!pip install -q peft==0.12.0\n',
        '!pip install -q trl==0.9.6\n',
        '!pip install -q accelerate==0.33.0\n',
        '!pip install -q bitsandbytes==0.43.3\n',
        '!pip install -q huggingface_hub\n',
        ...(use_wandb ? ['!pip install -q wandb\n'] : []),
        'print("✅ All packages installed!")\n',
      ]
    },
    // Cell 3: GPU check
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 🖥️ Check GPU { display-mode: "form" }\n',
        'import torch\n',
        'import subprocess\n\n',
        'gpu_info = subprocess.run(["nvidia-smi"], capture_output=True, text=True)\n',
        'if "failed" in gpu_info.stdout.lower() or gpu_info.returncode != 0:\n',
        '    print("❌ No GPU detected. Change runtime to GPU!")\n',
        'else:\n',
        '    print("✅ GPU detected:")\n',
        '    print(gpu_info.stdout[:500])\n',
        '    print(f"\\n🔥 PyTorch CUDA: {torch.cuda.is_available()}")\n',
        '    if torch.cuda.is_available():\n',
        '        print(f"📊 GPU: {torch.cuda.get_device_name(0)}")\n',
        '        vram = torch.cuda.get_device_properties(0).total_memory / 1e9\n',
        `        print(f"💾 VRAM: {vram:.1f} GB (Need ~${model?.vram_gb || 16}GB for this model)")\n`,
        `        if vram < ${(model?.vram_gb || 16) * 0.8}:\n`,
        `            print("⚠️  WARNING: May OOM. Consider QLoRA or smaller batch size.")\n`,
      ]
    },
    // Cell 4: HuggingFace Login
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 🔑 HuggingFace Login { display-mode: "form" }\n',
        '# Required for gated models (Llama, Gemma etc.)\n',
        '# Add your HF_TOKEN in Colab Secrets panel\n',
        'from google.colab import userdata\n',
        'import os\n\n',
        'try:\n',
        '    HF_TOKEN = userdata.get("HF_TOKEN")\n',
        '    from huggingface_hub import login\n',
        '    login(token=HF_TOKEN)\n',
        '    print("✅ Logged in to HuggingFace!")\n',
        'except Exception as e:\n',
        '    print(f"⚠️  No HF_TOKEN found. Public models only. Error: {e}")\n',
        '    HF_TOKEN = None\n',
      ]
    },
    // Cell 5: Config
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title ⚙️ Training Configuration { display-mode: "form" }\n',
        '# Modify these values as needed\n\n',
        `MODEL_ID = "${modelId}"  # @param {type:"string"}\n`,
        `METHOD = "${method}"  # @param ["lora", "qlora", "full_ft"]\n`,
        `TASK_TYPE = "${task_type}"  # @param ["causal_lm", "seq2seq", "classification"]\n`,
        `DATASET_FORMAT = "${dataset_format}"  # @param ["alpaca", "sharegpt", "raw_text", "csv", "jsonl"]\n`,
        `EPOCHS = ${epochs}  # @param {type:"number"}\n`,
        `BATCH_SIZE = ${batch_size}  # @param {type:"number"}\n`,
        `GRAD_ACCUM = ${gradient_accumulation_steps}  # @param {type:"number"}\n`,
        `LEARNING_RATE = ${learning_rate}  # @param {type:"number"}\n`,
        `MAX_SEQ_LENGTH = ${max_seq_length}  # @param {type:"number"}\n`,
        `OUTPUT_DIR = "${output_dir}"  # @param {type:"string"}\n\n`,
        isLoRA ? [
          `# LoRA Config\n`,
          `LORA_R = ${lora_r}  # @param {type:"number"}\n`,
          `LORA_ALPHA = ${lora_alpha}  # @param {type:"number"}\n`,
          `LORA_DROPOUT = ${lora_dropout}  # @param {type:"number"}\n`,
          `LORA_TARGET_MODULES = "${lora_target_modules}".split(",")  # @param {type:"string"}\n`,
        ].join('') : '',
        isQLoRA ? [
          `QUANTIZATION_BITS = ${quantization_bits || 4}  # @param [4, 8]\n`,
        ].join('') : '',
        push_to_hub ? [
          `\n# HuggingFace Hub Push\n`,
          `PUSH_TO_HUB = True  # @param {type:"boolean"}\n`,
          `HUB_MODEL_ID = "${hub_model_id}"  # @param {type:"string"}\n`,
        ].join('') : 'PUSH_TO_HUB = False\n',
        use_wandb ? [
          `\n# W&B Logging\n`,
          `USE_WANDB = True  # @param {type:"boolean"}\n`,
          `WANDB_PROJECT = "${wandb_project}"  # @param {type:"string"}\n`,
        ].join('') : 'USE_WANDB = False\n',
        '\nprint("✅ Configuration loaded!")\n',
        'print(f"  Model: {MODEL_ID}")\n',
        'print(f"  Method: {METHOD}")\n',
        'print(f"  Epochs: {EPOCHS}, LR: {LEARNING_RATE}, Batch: {BATCH_SIZE}")\n',
      ]
    },
    // Cell 6: Dataset
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 📂 Load Dataset { display-mode: "form" }\n',
        '# Upload your dataset OR use a HuggingFace dataset\n\n',
        'from datasets import load_dataset\n',
        'import json, pandas as pd\n\n',
        '# ─── Option 1: Upload local file ───────────────────────────────\n',
        '# from google.colab import files\n',
        '# uploaded = files.upload()\n',
        '# dataset_file = list(uploaded.keys())[0]\n\n',
        '# ─── Option 2: Use HuggingFace dataset ─────────────────────────\n',
        '# Uncomment and change to your dataset:\n',
        '# dataset = load_dataset("tatsu-lab/alpaca", split="train")\n\n',
        '# ─── Option 3: Create from scratch ─────────────────────────────\n',
        '# Example with alpaca format (most common)\n',
        `if DATASET_FORMAT == "alpaca":\n`,
        '    # Alpaca format: {"instruction": "...", "input": "...", "output": "..."}\n',
        '    sample_data = [\n',
        '        {"instruction": "Summarize the following text.", "input": "The cat sat on the mat.", "output": "A cat was on a mat."},\n',
        '        {"instruction": "Translate to French.", "input": "Hello world", "output": "Bonjour le monde"},\n',
        '    ]\n',
        '    dataset = load_dataset("json", data_files={"train": "data.json"}, split="train") if False else None\n',
        '    print("⚠️  Using sample data. Replace with your actual dataset!")\n',
        '    \n',
        '    # Format function for Alpaca\n',
        '    def format_alpaca(example):\n',
        '        if example.get("input"):\n',
        '            prompt = f\'### Instruction:\\n{example["instruction"]}\\n\\n### Input:\\n{example["input"]}\\n\\n### Response:\\n{example["output"]}\'\n',
        '        else:\n',
        '            prompt = f\'### Instruction:\\n{example["instruction"]}\\n\\n### Response:\\n{example["output"]}\'\n',
        '        return {"text": prompt}\n\n',
        `elif DATASET_FORMAT == "sharegpt":\n`,
        '    # ShareGPT format: {"conversations": [{"from": "human", "value": "..."}, {"from": "gpt", "value": "..."}]}\n',
        '    def format_sharegpt(example):\n',
        '        text = ""\n',
        '        for turn in example["conversations"]:\n',
        '            role = "User" if turn["from"] == "human" else "Assistant"\n',
        '            text += f"{role}: {turn[\'value\']}\\n"\n',
        '        return {"text": text.strip()}\n\n',
        'print("✅ Dataset format configured!")\n',
      ]
    },
    // Cell 7: Load Model
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 🤖 Load Model & Tokenizer { display-mode: "form" }\n',
        'import torch\n',
        'from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\n\n',
        '# Quantization config for QLoRA\n',
        isQLoRA ? [
          'bnb_config = BitsAndBytesConfig(\n',
          `    load_in_${quantization_bits || 4}bit=True,\n`,
          `    bnb_${quantization_bits || 4}bit_quant_type="nf4",\n`,
          `    bnb_${quantization_bits || 4}bit_compute_dtype=torch.bfloat16,\n`,
          `    bnb_${quantization_bits || 4}bit_use_double_quant=True,\n`,
          ')\n',
          'model_kwargs = {"quantization_config": bnb_config}\n',
        ].join('') : [
          'model_kwargs = {}\n',
          fp16 ? 'model_kwargs["torch_dtype"] = torch.float16\n' : '',
          bf16 ? 'model_kwargs["torch_dtype"] = torch.bfloat16\n' : '',
        ].join(''),
        '\nprint(f"📥 Loading tokenizer: {MODEL_ID}")\n',
        'tokenizer = AutoTokenizer.from_pretrained(\n',
        '    MODEL_ID,\n',
        '    token=HF_TOKEN,\n',
        '    trust_remote_code=True\n',
        ')\n',
        'if tokenizer.pad_token is None:\n',
        '    tokenizer.pad_token = tokenizer.eos_token\n',
        '    tokenizer.pad_token_id = tokenizer.eos_token_id\n',
        'tokenizer.padding_side = "right"\n\n',
        'print(f"📥 Loading model: {MODEL_ID}")\n',
        'model = AutoModelForCausalLM.from_pretrained(\n',
        '    MODEL_ID,\n',
        '    device_map="auto",\n',
        '    token=HF_TOKEN,\n',
        '    trust_remote_code=True,\n',
        '    **model_kwargs\n',
        ')\n',
        'model.config.use_cache = False\n',
        gradient_checkpointing ? 'model.gradient_checkpointing_enable()\n' : '',
        '\nparams = sum(p.numel() for p in model.parameters()) / 1e9\n',
        'print(f"✅ Model loaded! Parameters: {params:.2f}B")\n',
        'print(f"📊 Memory: {torch.cuda.memory_allocated() / 1e9:.2f} GB used")\n',
      ]
    },
    // Cell 8: LoRA/PEFT config
    ...(isLoRA ? [{
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 🎛️ Configure LoRA/PEFT { display-mode: "form" }\n',
        'from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training\n\n',
        isQLoRA ? 'model = prepare_model_for_kbit_training(model)\n\n' : '',
        'lora_config = LoraConfig(\n',
        `    r=${lora_r},\n`,
        `    lora_alpha=${lora_alpha},\n`,
        `    target_modules=LORA_TARGET_MODULES,\n`,
        `    lora_dropout=${lora_dropout},\n`,
        '    bias="none",\n',
        `    task_type=TaskType.CAUSAL_LM,\n`,
        ')\n\n',
        'model = get_peft_model(model, lora_config)\n',
        'model.print_trainable_parameters()\n',
        '\n# Trainable vs frozen params\n',
        'trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)\n',
        'total = sum(p.numel() for p in model.parameters())\n',
        'print(f"📊 Trainable: {trainable/1e6:.2f}M / {total/1e9:.2f}B ({100*trainable/total:.3f}%)")\n',
      ]
    }] : []),
    // Cell 9: Training
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 🚀 Start Training { display-mode: "form" }\n',
        'from trl import SFTTrainer, SFTConfig\n',
        'from transformers import TrainingArguments\n',
        'import os, time\n\n',
        use_wandb ? [
          'import wandb\n',
          'wandb.login(key=os.environ.get("WANDB_API_KEY", ""))\n',
          `wandb.init(project=WANDB_PROJECT, name=f"finetune-{MODEL_ID.split(\'/\')[-1]}")\n\n`,
        ].join('') : '',
        'training_args = SFTConfig(\n',
        '    output_dir=OUTPUT_DIR,\n',
        `    num_train_epochs=EPOCHS,\n`,
        '    per_device_train_batch_size=BATCH_SIZE,\n',
        '    gradient_accumulation_steps=GRAD_ACCUM,\n',
        `    learning_rate=LEARNING_RATE,\n`,
        `    lr_scheduler_type="${lr_scheduler}",\n`,
        `    warmup_ratio=${warmup_ratio},\n`,
        `    max_seq_length=MAX_SEQ_LENGTH,\n`,
        `    weight_decay=${weight_decay},\n`,
        `    max_grad_norm=${max_grad_norm},\n`,
        fp16 ? '    fp16=True,\n' : '',
        bf16 ? '    bf16=True,\n' : '',
        `    save_steps=${save_steps},\n`,
        `    eval_strategy="no",\n`,
        '    logging_steps=10,\n',
        '    optim="paged_adamw_32bit" if METHOD == "qlora" else "adamw_torch",\n',
        '    report_to="wandb" if USE_WANDB else "none",\n',
        '    push_to_hub=PUSH_TO_HUB,\n',
        push_to_hub ? '    hub_model_id=HUB_MODEL_ID,\n' : '',
        ')\n\n',
        'trainer = SFTTrainer(\n',
        '    model=model,\n',
        '    args=training_args,\n',
        '    train_dataset=dataset,\n',
        '    formatting_func=format_alpaca if DATASET_FORMAT == "alpaca" else None,\n',
        '    tokenizer=tokenizer,\n',
        ')\n\n',
        'print("🚀 Starting training...")\n',
        'start = time.time()\n',
        'trainer.train()\n',
        'elapsed = time.time() - start\n',
        'print(f"\\n✅ Training complete! Time: {elapsed/60:.1f} minutes")\n',
      ]
    },
    // Cell 10: Save & Merge
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 💾 Save, Merge & Download { display-mode: "form" }\n',
        'import os\n',
        'from google.colab import files\n\n',
        `# Save adapter weights\n`,
        'model.save_pretrained(OUTPUT_DIR)\n',
        'tokenizer.save_pretrained(OUTPUT_DIR)\n',
        'print(f"✅ Adapter saved to {OUTPUT_DIR}")\n\n',
        isLoRA ? [
          '# Merge LoRA weights with base model (optional — for full model)\n',
          '# Uncomment if you want a merged model:\n',
          '# from peft import PeftModel\n',
          '# base_model = AutoModelForCausalLM.from_pretrained(MODEL_ID, token=HF_TOKEN)\n',
          '# merged = PeftModel.from_pretrained(base_model, OUTPUT_DIR)\n',
          '# merged = merged.merge_and_unload()\n',
          '# merged.save_pretrained("merged_model")\n',
          '# print("✅ Merged model saved!")\n\n',
        ].join('') : '',
        '# Zip and download\n',
        '!zip -r model_weights.zip {OUTPUT_DIR} -x "*.pyc"\n',
        'files.download("model_weights.zip")\n',
        'print("✅ Download started!")\n\n',
        push_to_hub ? [
          '# Push to HuggingFace Hub\n',
          'trainer.push_to_hub()\n',
          'print(f"✅ Pushed to: https://huggingface.co/{HUB_MODEL_ID}")\n',
        ].join('') : '',
      ]
    },
    // Cell 11: Inference test
    {
      cell_type: 'code', execution_count: null, metadata: {}, outputs: [],
      source: [
        '# @title 🧪 Test Inference { display-mode: "form" }\n',
        'from peft import PeftModel\n\n',
        'TEST_PROMPT = "Tell me about fine-tuning language models."  # @param {type:"string"}\n\n',
        '# Format the prompt\n',
        'if DATASET_FORMAT == "alpaca":\n',
        '    formatted = f"### Instruction:\\n{TEST_PROMPT}\\n\\n### Response:\\n"\n',
        'else:\n',
        '    formatted = TEST_PROMPT\n\n',
        'inputs = tokenizer(formatted, return_tensors="pt").to("cuda")\n',
        'with torch.no_grad():\n',
        '    outputs = model.generate(\n',
        '        **inputs,\n',
        '        max_new_tokens=256,\n',
        '        temperature=0.7,\n',
        '        top_p=0.9,\n',
        '        do_sample=True,\n',
        '        pad_token_id=tokenizer.eos_token_id\n',
        '    )\n',
        'response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)\n',
        'print(f"📝 Prompt: {TEST_PROMPT}")\n',
        'print(f"\\n🤖 Response: {response}")\n',
      ]
    },
  ]

  return {
    cells,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.10.12' },
      colab: {
        provenance: [],
        gpuType: 'T4',
        name: `System2ML_FineTune_${model?.name || 'Model'}`,
        include_colab_link: true
      },
      accelerator: 'GPU'
    },
    nbformat: 4,
    nbformat_minor: 5
  }
}

function generateJupyterNotebook(config: TrainingConfig): object {
  const colabNotebook = generateColabNotebook(config) as any
  // Jupyter is same structure, just remove Colab-specific cells (file upload/download)
  const cells = colabNotebook.cells.map((cell: any) => {
    if (cell.cell_type === 'code') {
      const source = cell.source.filter((line: string) =>
        !line.includes('google.colab') &&
        !line.includes('files.download') &&
        !line.includes('userdata.get')
      )
      // Replace Colab-specific auth with regular HF login
      const fixedSource = source.map((line: string) =>
        line.includes('HF_TOKEN = userdata')
          ? 'HF_TOKEN = os.environ.get("HF_TOKEN", "")  # Set via: export HF_TOKEN=your_token\n'
          : line
      )
      return { ...cell, source: fixedSource }
    }
    return cell
  })
  return {
    ...colabNotebook,
    cells,
    metadata: {
      ...colabNotebook.metadata,
      kernelspec: { display_name: 'Python 3 (ipykernel)', language: 'python', name: 'python3' },
    }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModelCard({ model, selected, onSelect }: { model: ModelConfig; selected: boolean; onSelect: () => void }) {
  const vramColor = model.vram_gb <= 16 ? 'text-emerald-400' : model.vram_gb <= 48 ? 'text-amber-400' : 'text-red-400'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'group text-left w-full p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.01]',
        selected
          ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-600'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn('font-bold text-base', selected ? 'text-brand-300' : 'text-white')}>{model.name}</h3>
            {selected && <CheckCircle className="w-4 h-4 text-brand-400" />}
          </div>
          <p className="text-xs text-neutral-500 font-mono">{model.hf_id}</p>
        </div>
        <span className={cn('text-sm font-bold px-2 py-1 rounded-lg border text-xs', vramColor,
          model.vram_gb <= 16 ? 'bg-emerald-500/10 border-emerald-500/20' :
          model.vram_gb <= 48 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'
        )}>
          {model.vram_gb}GB VRAM
        </span>
      </div>
      <p className="text-xs text-neutral-400 mb-3 leading-relaxed">{model.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {model.tags.map(t => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">{t}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />{model.params}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />{(model.context_length / 1000).toFixed(0)}K ctx
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800">{model.license}</span>
      </div>
      <div className="flex gap-1 mt-2">
        {model.supports_qlora && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20">QLoRA</span>}
        {model.supports_lora && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">LoRA</span>}
        {model.supports_full_ft && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20">Full FT</span>}
      </div>
    </button>
  )
}

function ConfigSlider({ label, value, min, max, step, onChange, description }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; description?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-300">{label}</label>
        <span className="text-sm text-brand-400 font-mono bg-brand-500/10 px-2 py-0.5 rounded">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-500"
      />
      {description && <p className="text-xs text-neutral-500">{description}</p>}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TrainingConfig = {
  model: null, method: 'qlora', task_type: 'causal_lm', dataset_format: 'alpaca',
  epochs: 3, batch_size: 4, learning_rate: 2e-4, max_seq_length: 2048,
  lora_r: 16, lora_alpha: 32, lora_dropout: 0.05,
  lora_target_modules: 'q_proj,v_proj,k_proj,o_proj',
  warmup_ratio: 0.03, lr_scheduler: 'cosine', fp16: false, bf16: true,
  gradient_checkpointing: true, save_steps: 100, eval_steps: 100,
  output_dir: './finetuned_model', push_to_hub: false, hub_model_id: '',
  use_wandb: false, wandb_project: 'finetuning', quantization_bits: 4,
  gradient_accumulation_steps: 4, weight_decay: 0.01, max_grad_norm: 1.0,
}

export default function FineTuningPage() {
  const [tab, setTab] = useState<Tab>('models')
  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG)
  const [familyFilter, setFamilyFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState<Platform>('colab')
  const [generating, setGenerating] = useState(false)
  const [notebook, setNotebook] = useState<object | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState('')

  const filteredModels = MODEL_REGISTRY.filter(m => {
    const matchFamily = familyFilter === 'All' || m.family === familyFilter
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.hf_id.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(t => t.includes(search.toLowerCase()))
    return matchFamily && matchSearch
  })

  const updateConfig = useCallback((key: keyof TrainingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleGenerateNotebook = async () => {
    if (!config.model) return
    setGenerating(true)
    await new Promise(r => setTimeout(r, 800)) // UX delay
    const nb = platform === 'colab' ? generateColabNotebook(config) : generateJupyterNotebook(config)
    setNotebook(nb)
    setTab('notebook')
    setGenerating(false)
  }

  const handleDownload = () => {
    if (!notebook) return
    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const modelName = config.model?.name.replace(/\s+/g, '_') || 'model'
    a.download = `system2ml_finetune_${modelName}_${platform}.ipynb`
    a.click()
  }

  const TABS: { id: Tab; label: string; icon: any; disabled?: boolean }[] = [
    { id: 'models', label: 'Select Model', icon: Brain },
    { id: 'config', label: 'Configure Training', icon: Settings, disabled: !config.model },
    { id: 'notebook', label: 'Notebook', icon: Code2, disabled: !notebook },
    { id: 'deploy', label: 'Deploy', icon: Globe, disabled: !notebook },
  ]

  const PLATFORMS = [
    { id: 'colab' as Platform, name: 'Google Colab', icon: '🎯', free: true, desc: 'T4/A100 free tier', best: true },
    { id: 'jupyter' as Platform, name: 'Jupyter / Local', icon: '💻', free: true, desc: 'Your own GPU', best: false },
    { id: 'kaggle' as Platform, name: 'Kaggle Notebooks', icon: '📊', free: true, desc: 'P100 free 30h/week', best: false },
    { id: 'runpod' as Platform, name: 'RunPod', icon: '⚡', free: false, desc: '$0.2/hr GPU cloud', best: false },
  ]

  const methodInfo = {
    qlora: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Best quality/VRAM ratio. 4-bit quant + LoRA. Recommended for most cases.' },
    lora: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Lower VRAM than full FT. Trains adapter layers only. Fast convergence.' },
    full_ft: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Best possible quality. Updates all weights. Needs max VRAM.' },
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand-400 text-xs font-mono tracking-widest uppercase mb-2">
              <FlaskConical className="w-4 h-4" /><span>Fine-Tuning Studio</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Train Any Open-Source Model</h1>
            <p className="text-neutral-500 text-sm max-w-xl">
              Configure fine-tuning with LoRA / QLoRA / Full FT, generate a production-ready notebook,
              and run on Colab, Kaggle, or your own GPU — completely free.
            </p>
          </div>
          {config.model && (
            <div className="hidden lg:flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <CheckCircle className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-white font-medium">{config.model.name}</span>
              </div>
              <span className="text-xs text-neutral-500">Selected model</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900/80 border border-white/5 rounded-2xl w-fit">
          {TABS.map((t, i) => {
            const Icon = t.icon
            return (
              <button key={t.id}
                onClick={() => !t.disabled && setTab(t.id)}
                disabled={t.disabled}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                  tab === t.id ? 'bg-brand-500 text-white shadow-lg' :
                  t.disabled ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />{t.label}
                {!t.disabled && tab !== t.id && i < TABS.findIndex(x => x.id === tab) && (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                )}
              </button>
            )
          })}
        </div>

        {/* ─── TAB: Model Selection ──────────────────────────────────────────── */}
        {tab === 'models' && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search models..."
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm w-64 focus:border-brand-500/50 focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                {FAMILIES.map(f => (
                  <button key={f} onClick={() => setFamilyFilter(f)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      familyFilter === f ? 'bg-brand-500 text-white' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    )}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* VRAM Guide */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900/50 border border-white/5 text-xs">
              <Info className="w-4 h-4 text-neutral-500 shrink-0" />
              <span className="text-neutral-500">VRAM Guide:</span>
              <span className="text-emerald-400">≤16GB → Colab T4 (free)</span>
              <span className="text-amber-400">≤48GB → Colab A100 / RunPod</span>
              <span className="text-red-400">&gt;48GB → Multi-GPU needed</span>
              <span className="text-neutral-500 ml-auto">QLoRA reduces VRAM by ~4x</span>
            </div>

            {/* Model Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map(model => (
                <ModelCard key={model.id} model={model}
                  selected={config.model?.id === model.id}
                  onSelect={() => { updateConfig('model', model); setTab('config') }}
                />
              ))}
            </div>

            {config.model && (
              <div className="flex justify-end">
                <Button onClick={() => setTab('config')} className="bg-brand-500 hover:bg-brand-600">
                  Configure Training <Zap className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: Configuration ──────────────────────────────────────────────── */}
        {tab === 'config' && config.model && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Core Config */}
            <div className="lg:col-span-2 space-y-6">
              {/* Method Selection */}
              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-400" /> Training Method
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['qlora', 'lora', 'full_ft'] as const).map(m => {
                    const info = methodInfo[m]
                    const disabled = m === 'full_ft' && !config.model?.supports_full_ft
                    return (
                      <button key={m} onClick={() => !disabled && updateConfig('method', m)} disabled={disabled}
                        className={cn('p-4 rounded-xl border-2 text-left transition-all',
                          config.method === m ? `${info.bg} ${info.border}` : 'border-neutral-700 bg-neutral-800/30',
                          disabled && 'opacity-40 cursor-not-allowed'
                        )}>
                        <div className={cn('font-bold text-sm mb-1', config.method === m ? info.color : 'text-neutral-300')}>
                          {m === 'full_ft' ? 'Full FT' : m.toUpperCase()}
                        </div>
                        <p className="text-xs text-neutral-500">{info.desc}</p>
                        {disabled && <span className="text-[10px] text-red-400 mt-1 block">Not supported</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Quantization for QLoRA */}
                {config.method === 'qlora' && (
                  <div className="flex gap-3">
                    {([4, 8] as const).map(bits => (
                      <button key={bits} onClick={() => updateConfig('quantization_bits', bits)}
                        className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                          config.quantization_bits === bits
                            ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                        )}>
                        {bits}-bit Quantization
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Task & Dataset */}
              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-400" /> Task & Dataset
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Task Type</label>
                    <select value={config.task_type} onChange={e => updateConfig('task_type', e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none">
                      <option value="causal_lm">Causal LM (GPT-style)</option>
                      <option value="seq2seq">Seq2Seq (T5-style)</option>
                      <option value="classification">Classification</option>
                      <option value="regression">Regression</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Dataset Format</label>
                    <select value={config.dataset_format} onChange={e => updateConfig('dataset_format', e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none">
                      <option value="alpaca">Alpaca (instruction/input/output)</option>
                      <option value="sharegpt">ShareGPT (conversations)</option>
                      <option value="raw_text">Raw Text</option>
                      <option value="csv">CSV</option>
                      <option value="jsonl">JSONL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Hyperparameters */}
              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-400" /> Hyperparameters
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <ConfigSlider label="Epochs" value={config.epochs} min={1} max={10} step={1}
                    onChange={v => updateConfig('epochs', v)} description="Full passes over training data" />
                  <ConfigSlider label="Batch Size" value={config.batch_size} min={1} max={32} step={1}
                    onChange={v => updateConfig('batch_size', v)} description="Samples per GPU step" />
                  <ConfigSlider label="Max Seq Length" value={config.max_seq_length} min={512} max={8192} step={128}
                    onChange={v => updateConfig('max_seq_length', v)} description="Max tokens per sample" />
                  <ConfigSlider label="Grad Accumulation" value={config.gradient_accumulation_steps} min={1} max={32} step={1}
                    onChange={v => updateConfig('gradient_accumulation_steps', v)} description="Effective batch = batch × accum" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm text-neutral-300">Learning Rate</label>
                    <span className="text-sm text-brand-400 font-mono">{config.learning_rate.toExponential(0)}</span>
                  </div>
                  <input type="range" min={1e-5} max={1e-3} step={1e-5} value={config.learning_rate}
                    onChange={e => updateConfig('learning_rate', parseFloat(e.target.value))}
                    className="w-full accent-brand-500" />
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>1e-5 (conservative)</span><span>1e-4 (default)</span><span>1e-3 (aggressive)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">LR Scheduler</label>
                  <div className="flex gap-2">
                    {['cosine', 'linear', 'constant', 'polynomial'].map(s => (
                      <button key={s} onClick={() => updateConfig('lr_scheduler', s)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs transition-all border',
                          config.lr_scheduler === s ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'border-neutral-700 text-neutral-400')}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* LoRA Params */}
              {(config.method === 'lora' || config.method === 'qlora') && (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" /> LoRA Configuration
                  </h3>
                  <div className="grid grid-cols-3 gap-5">
                    <ConfigSlider label="LoRA Rank (r)" value={config.lora_r} min={4} max={128} step={4}
                      onChange={v => updateConfig('lora_r', v)} description="Higher = more capacity, more VRAM" />
                    <ConfigSlider label="LoRA Alpha" value={config.lora_alpha} min={8} max={256} step={8}
                      onChange={v => updateConfig('lora_alpha', v)} description="Scaling factor. Usually 2×r" />
                    <ConfigSlider label="LoRA Dropout" value={config.lora_dropout} min={0} max={0.3} step={0.01}
                      onChange={v => updateConfig('lora_dropout', Math.round(v * 100) / 100)} description="Regularization. 0.05 is standard" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Target Modules (comma-separated)</label>
                    <input value={config.lora_target_modules}
                      onChange={e => updateConfig('lora_target_modules', e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-brand-500 focus:outline-none"
                      placeholder="q_proj,v_proj,k_proj,o_proj" />
                    <div className="flex gap-2">
                      {[
                        { label: 'QKV Only', val: 'q_proj,v_proj,k_proj' },
                        { label: 'All Attention', val: 'q_proj,v_proj,k_proj,o_proj' },
                        { label: 'All Linear', val: 'q_proj,v_proj,k_proj,o_proj,gate_proj,up_proj,down_proj' },
                      ].map(p => (
                        <button key={p.label} onClick={() => updateConfig('lora_target_modules', p.val)}
                          className="px-2 py-1 rounded text-[10px] bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-colors">
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Settings Toggle */}
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'fp16', label: 'FP16', desc: 'Half precision' },
                      { key: 'bf16', label: 'BF16', desc: 'BFloat16 (better stability)' },
                      { key: 'gradient_checkpointing', label: 'Gradient Checkpointing', desc: 'Trade compute for VRAM' },
                      { key: 'push_to_hub', label: 'Push to HuggingFace Hub', desc: 'Auto-upload after training' },
                      { key: 'use_wandb', label: 'W&B Logging', desc: 'Track experiments' },
                    ].map(({ key, label, desc }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={config[key as keyof TrainingConfig] as boolean}
                          onChange={e => updateConfig(key as keyof TrainingConfig, e.target.checked)}
                          className="w-4 h-4 rounded accent-brand-500" />
                        <div><p className="text-sm text-white">{label}</p><p className="text-xs text-neutral-500">{desc}</p></div>
                      </label>
                    ))}
                  </div>
                  {config.push_to_hub && (
                    <div className="space-y-2">
                      <label className="text-sm text-neutral-300">Hub Model ID</label>
                      <input value={config.hub_model_id} onChange={e => updateConfig('hub_model_id', e.target.value)}
                        placeholder="username/my-finetuned-model"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Summary */}
            <div className="space-y-4">
              <div className="sticky top-4 space-y-4">
                {/* Model card */}
                <div className="p-5 rounded-2xl bg-neutral-900/50 border border-brand-500/20 space-y-3">
                  <h4 className="text-sm font-bold text-white">Selected Configuration</h4>
                  {[
                    { label: 'Model', value: config.model.name },
                    { label: 'Method', value: config.method.toUpperCase() },
                    { label: 'Task', value: config.task_type },
                    { label: 'Dataset', value: config.dataset_format },
                    { label: 'Epochs', value: config.epochs },
                    { label: 'Eff. Batch', value: config.batch_size * config.gradient_accumulation_steps },
                    { label: 'LR', value: config.learning_rate.toExponential(0) },
                    { label: 'VRAM Needed', value: `~${config.method === 'qlora' ? Math.ceil(config.model.vram_gb / 4) : config.model.vram_gb}GB` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Platform Selection */}
                <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-3">
                  <h4 className="text-sm font-bold text-white">Target Platform</h4>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                        platform === p.id ? 'border-brand-500 bg-brand-500/10' : 'border-neutral-700 hover:border-neutral-600')}>
                      <span className="text-xl">{p.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{p.name}</span>
                          {p.free && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">FREE</span>}
                          {p.best && <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">BEST</span>}
                        </div>
                        <p className="text-xs text-neutral-500">{p.desc}</p>
                      </div>
                      {platform === p.id && <CheckCircle className="w-4 h-4 text-brand-400" />}
                    </button>
                  ))}
                </div>

                <Button onClick={handleGenerateNotebook} disabled={generating || !config.model}
                  className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 h-12 text-base">
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> :
                    <><Sparkles className="w-4 h-4 mr-2" />Generate Notebook</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Notebook ────────────────────────────────────────────────────── */}
        {tab === 'notebook' && notebook && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300 font-medium">
                    {(notebook as any).cells?.length} cells generated for {config.model?.name}
                  </span>
                </div>
                <Badge className="bg-brand-500/20 text-brand-400 border-brand-500/30">
                  {platform === 'colab' ? 'Google Colab' : 'Jupyter'}
                </Badge>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleDownload} className="bg-brand-500 hover:bg-brand-600">
                  <Download className="w-4 h-4 mr-2" />Download .ipynb
                </Button>
                {platform === 'colab' && (
                  <Button variant="outline" className="border-neutral-700"
                    onClick={() => window.open('https://colab.research.google.com', '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />Open Colab
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Start Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(platform === 'colab' ? [
                { step: '1', icon: Download, title: 'Download Notebook', desc: 'Click Download .ipynb above', color: 'text-brand-400' },
                { step: '2', icon: ExternalLink, title: 'Upload to Colab', desc: 'colab.research.google.com → File → Upload', color: 'text-blue-400' },
                { step: '3', icon: Play, title: 'Run All Cells', desc: 'Runtime → T4 GPU → Run all', color: 'text-emerald-400' },
              ] : [
                { step: '1', icon: Terminal, title: 'Install Jupyter', desc: 'pip install jupyter', color: 'text-brand-400' },
                { step: '2', icon: Download, title: 'Download Notebook', desc: 'Click Download .ipynb above', color: 'text-blue-400' },
                { step: '3', icon: Play, title: 'Run Notebook', desc: 'jupyter notebook → open file', color: 'text-emerald-400' },
              ] as const).map(({ step, icon: Icon, title, desc, color }) => (
                <div key={step} className="p-4 rounded-xl bg-neutral-900/50 border border-white/5 flex items-start gap-4">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border', color,
                    color.includes('brand') ? 'bg-brand-500/10 border-brand-500/20' :
                    color.includes('blue') ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20')}>
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-neutral-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Notebook Preview */}
            <div className="rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="bg-neutral-900 px-4 py-3 flex items-center gap-2 border-b border-neutral-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-neutral-400 ml-2 font-mono">
                  system2ml_finetune_{config.model?.name.replace(/\s+/g, '_')}.ipynb
                </span>
                <span className="ml-auto text-xs text-neutral-600">{(notebook as any).cells?.length} cells</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto bg-neutral-950">
                {((notebook as any).cells || []).map((cell: any, i: number) => (
                  <div key={i} className={cn('border-b border-neutral-900', cell.cell_type === 'markdown' ? 'bg-neutral-900/30' : '')}>
                    <div className="flex items-start">
                      <div className="w-14 py-3 px-3 text-xs text-neutral-600 font-mono text-right shrink-0 border-r border-neutral-900">
                        {cell.cell_type === 'code' ? `[${i + 1}]` : 'MD'}
                      </div>
                      <div className="flex-1 py-3 px-4 relative group">
                        {cell.cell_type === 'code' ? (
                          <div className="relative">
                            <CopyButton text={cell.source.join('')} />
                            <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-48 pr-8">
                              {cell.source.join('').slice(0, 600)}{cell.source.join('').length > 600 ? '\n...' : ''}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-400 font-mono whitespace-pre-wrap leading-relaxed">
                            {cell.source.join('').slice(0, 300)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Deploy ────────────────────────────────────────────────────────── */}
        {tab === 'deploy' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Deploy Your Fine-Tuned Model</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'HuggingFace Spaces', icon: '🤗', free: true, badge: 'FREE HOSTING',
                  desc: 'Deploy as a Gradio/Streamlit app. Free CPU tier, GPU from $0.05/hr.',
                  steps: ['Push model to HuggingFace Hub', 'Create a Space', 'Add Gradio inference code', 'Deploy publicly'],
                  link: 'https://huggingface.co/spaces', cmd: 'huggingface-cli upload username/model ./output'
                },
                {
                  title: 'Ollama (Local)', icon: '🦙', free: true, badge: 'LOCAL',
                  desc: 'Run your model locally with a REST API. Perfect for development.',
                  steps: ['Convert to GGUF format', 'Create Modelfile', 'ollama create my-model -f Modelfile', 'ollama run my-model'],
                  link: 'https://ollama.com', cmd: 'python llama.cpp/convert-hf-to-gguf.py ./output'
                },
                {
                  title: 'vLLM (Production)', icon: '⚡', free: false, badge: 'PRODUCTION',
                  desc: 'High-throughput inference server. Used by major AI companies.',
                  steps: ['pip install vllm', 'Load your LoRA adapter', 'Start server with CLI', 'OpenAI-compatible API'],
                  link: 'https://vllm.ai', cmd: 'python -m vllm.entrypoints.openai.api_server --model output/'
                },
                {
                  title: 'Together AI / Replicate', icon: '🌐', free: false, badge: 'CLOUD API',
                  desc: 'Upload model once, get a scalable API endpoint. Pay per token.',
                  steps: ['Create account', 'Upload model files', 'Get API endpoint', 'Call via REST API'],
                  link: 'https://replicate.com', cmd: 'replicate push username/model:v1'
                },
              ].map(({ title, icon, free, badge, desc, steps, link, cmd }) => (
                <div key={title} className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <h3 className="font-bold text-white">{title}</h3>
                        <Badge className={cn('text-[10px]', free ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30')}>
                          {badge}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-neutral-700 text-xs"
                      onClick={() => window.open(link, '_blank')}>
                      <ExternalLink className="w-3 h-3 mr-1" />Open
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-400">{desc}</p>
                  <div className="space-y-1">
                    {steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="w-4 h-4 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] font-bold text-neutral-500 shrink-0">{i + 1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                    <code className="text-xs text-emerald-400 font-mono flex-1 truncate">{cmd}</code>
                    <CopyButton text={cmd} />
                  </div>
                </div>
              ))}
            </div>

            {/* Inference code */}
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-brand-400" />Quick Inference Code
              </h3>
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
                  <span className="text-xs text-neutral-500 font-mono">inference.py</span>
                  <CopyButton text={`from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# Load base model + LoRA adapter
model_id = "${config.model?.hf_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct'}"
adapter_path = "./finetuned_model"

tokenizer = AutoTokenizer.from_pretrained(model_id)
base_model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")
model = PeftModel.from_pretrained(base_model, adapter_path)

# Inference
prompt = "### Instruction:\\nTell me about fine-tuning.\\n\\n### Response:\\n"
inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
with torch.no_grad():
    outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.7, do_sample=True)
response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
print(response)`} />
                </div>
                <pre className="p-4 text-xs text-neutral-300 font-mono overflow-x-auto leading-relaxed">{`from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# Load base model + LoRA adapter
model_id = "${config.model?.hf_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct'}"
adapter_path = "./finetuned_model"

tokenizer = AutoTokenizer.from_pretrained(model_id)
base_model = AutoModelForCausalLM.from_pretrained(
    model_id, torch_dtype=torch.bfloat16, device_map="auto"
)
model = PeftModel.from_pretrained(base_model, adapter_path)

# Inference
prompt = "### Instruction:\\nTell me about fine-tuning.\\n\\n### Response:\\n"
inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
with torch.no_grad():
    outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.7, do_sample=True)
response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
print(response)`}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
