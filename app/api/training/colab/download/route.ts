import { NextRequest, NextResponse } from 'next/server'

const jobs = new Map<string, any>()

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    
    if (!jobId) {
        return NextResponse.json({ error: 'Missing job_id parameter' }, { status: 400 })
    }
    
    const job = jobs.get(jobId)
    
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    const notebookContent = job.notebook_content
    
    return new NextResponse(notebookContent, {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="system2ml-training-${jobId}.ipynb"`,
        },
    })
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { dataset_profile, training_target, constraints } = body
        
        const jobId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        
        const modelId = training_target?.base_model || 'microsoft/phi-2'
        const method = training_target?.method || 'lora'
        const maxBudget = training_target?.max_budget_usd || 10
        
        const notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [`# Fine-Tuning ${modelId.split('/').pop()} with ${method.toUpperCase()}\n`, "**System2ML Pipeline Training**\n", `Dataset: ${dataset_profile?.name || 'training_data'} (${dataset_profile?.rows || 'N/A'} rows)`]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Install dependencies\n",
                        "!pip install -q transformers datasets peft accelerate bitsandbytes torch\n",
                        "!pip install -q scikit-learn pandas numpy"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "import os\n",
                        "import json\n",
                        "import pandas as pd\n",
                        "import torch\n",
                        "from datetime import datetime\n",
                        "\n",
                        "# Configuration\n",
                        `MODEL_NAME = "${modelId}"\n`,
                        `TRAINING_METHOD = "${method}"\n`,
                        `MAX_BUDGET_USD = ${maxBudget}\n`,
                        "\n",
                        "print(f\"Starting training: {MODEL_NAME} with {TRAINING_METHOD}\")\n",
                        "print(f\"Max budget: ${MAX_BUDGET_USD}\")\n",
                        "print(f\"Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}\")"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Load dataset (upload your CSV file in Colab)\n",
                        "from google.colab import files\n",
                        "uploaded = files.upload()\n",
                        "filename = list(uploaded.keys())[0]\n",
                        "df = pd.read_csv(filename)\n",
                        "print(f\"Dataset loaded: {len(df)} rows\")\n",
                        "print(f\"Columns: {list(df.columns)}\")"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Prepare data for training\n",
                        "from sklearn.model_selection import train_test_split\n",
                        "\n",
                        "label_col = 'target' if 'target' in df.columns else df.columns[-1]\n",
                        "feature_cols = [c for c in df.columns if c != label_col]\n",
                        "\n",
                        "X = df[feature_cols].values\n",
                        "y = df[label_col].values\n",
                        "\n",
                        "X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)\n",
                        "print(f\"Train: {len(X_train)}, Val: {len(X_val)}\")"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Load model and tokenizer\n",
                        "from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer\n",
                        "from peft import LoraConfig, get_peft_model, TaskType\n",
                        "\n",
                        "tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\n",
                        "model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map='auto', trust_remote_code=True)\n",
                        "\n",
                        "lora_config = LoraConfig(\n",
                        "    r=8,\n",
                        "    lora_alpha=16,\n",
                        "    target_modules=['q_proj', 'v_proj'],\n",
                        "    lora_dropout=0.05,\n",
                        "    bias='none',\n",
                        "    task_type=TaskType.CAUSAL_LM\n",
                        ")\n",
                        "model = get_peft_model(model, lora_config)\n",
                        "model.print_trainable_parameters()"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Prepare datasets\n",
                        "from datasets import Dataset\n",
                        "\n",
                        "train_dataset = Dataset.from_dict({'text': [str(x) for x in X_train], 'label': [str(y) for y in y_train]})\n",
                        "val_dataset = Dataset.from_dict({'text': [str(x) for x in X_val], 'label': [str(y) for y in y_val]})\n",
                        "\n",
                        "def tokenize_function(examples):\n",
                        "    return tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)\n",
                        "\n",
                        "train_dataset = train_dataset.map(tokenize_function, batched=True)\n",
                        "val_dataset = val_dataset.map(tokenize_function, batched=True)\n",
                        "print(\"Datasets tokenized\")"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Training arguments\n",
                        "training_args = TrainingArguments(\n",
                        "    output_dir='./results',\n",
                        "    num_train_epochs=3,\n",
                        "    per_device_train_batch_size=4,\n",
                        "    per_device_eval_batch_size=4,\n",
                        "    warmup_steps=100,\n",
                        "    logging_dir='./logs',\n",
                        "    logging_steps=10,\n",
                        "    eval_strategy='epoch',\n",
                        "    save_strategy='epoch',\n",
                        "    load_best_model_at_end=True,\n",
                        "    metric_for_best_model='eval_loss',\n",
                        "    report_to='none'\n",
                        ")\n",
                        "\n",
                        "trainer = Trainer(\n",
                        "    model=model,\n",
                        "    args=training_args,\n",
                        "    train_dataset=train_dataset,\n",
                        "    eval_dataset=val_dataset\n",
                        ")"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Start training\n",
                        "print(\"Starting training...\")\n",
                        "trainer.train()\n",
                        "print(\"Training complete!\")"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": null,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Save model\n",
                        "model.save_pretrained('/content/fine_tuned_model')\n",
                        "tokenizer.save_pretrained('/content/fine_tuned_model')\n",
                        "print(\"Model saved to /content/fine_tuned_model\")\n",
                        "\n",
                        "# Download model\n",
                        "!zip -r model.zip /content/fine_tuned_model\n",
                        "files.download('model.zip')"
                    ]
                }
            ],
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3"
                },
                "language_info": {
                    "name": "python",
                    "version": "3.10.12"
                },
                "colab": {
                    "provenance": [],
                    "include_colab_link": true
                }
            },
            "nbformat": 4,
            "nbformat_minor": 4
        }
        
        const notebookJson = JSON.stringify(notebook, null, 2)
        
        const job = {
            job_id: jobId,
            status: 'created',
            config: {
                model_name: training_target?.base_model || 'microsoft/phi-2',
                method: training_target?.method || 'lora',
                max_budget: training_target?.max_budget_usd || 10,
                dataset_name: dataset_profile?.name || 'training_data',
            },
            notebook_content: notebookJson,
            created_at: new Date().toISOString()
        }
        
        jobs.set(jobId, job)
        
        const response = {
            job_id: jobId,
            status: 'created',
            config: job.config,
            notebook_content: notebookJson,
            download_url: `/api/training/colab/download?job_id=${jobId}`,
            colab_url: `https://colab.research.google.com/#new`,
            instructions: [
                '1. Click "Open in Google Colab" below to create a new notebook',
                '2. In Colab: File > Upload notebook',
                '3. Upload the .ipynb file from the download link',
                '4. Or copy-paste the code cells manually',
                '5. Run the cells to train your model',
                '6. Download the fine-tuned model when complete'
            ]
        }
        
        return NextResponse.json(response)
        
    } catch (error: any) {
        console.error('Colab create error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create Colab training' },
            { status: 500 }
        )
    }
}
