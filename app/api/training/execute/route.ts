import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const jobs = new Map<string, any>()

function generateTrainingScript(config: any) {
    const modelName = config.training_target?.base_model || 'microsoft/phi-2'
    const method = config.training_target?.method || 'lora'
    const datasetPath = config.dataset_profile?.name || 'data.csv'
    
    return `
import os
import sys
import json
import pandas as pd
import torch
from datetime import datetime
from sklearn.model_selection import train_test_split

print("=" * 50)
print("System2ML Local GPU Training")
print("=" * 50)

# Check GPU
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

# Configuration
MODEL_NAME = "${modelName}"
TRAINING_METHOD = "${method}"
DATASET_PATH = "${datasetPath}"

print(f"Model: {MODEL_NAME}")
print(f"Method: {TRAINING_METHOD}")

# Load dataset
print("\\n[1/6] Loading dataset...")
df = pd.read_csv(DATASET_PATH)
print(f"Dataset: {len(df)} rows, {len(df.columns)} columns")

# Prepare data
label_col = 'target' if 'target' in df.columns else df.columns[-1]
feature_cols = [c for c in df.columns if c != label_col]
X = df[feature_cols].values
y = df[label_col].values
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"Train: {len(X_train)}, Val: {len(X_val)}")

# Install dependencies
print("\\n[2/6] Installing dependencies...")
os.system("pip install -q transformers datasets peft accelerate bitsandbytes")

# Load model
print("\\n[3/6] Loading model...")
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model, TaskType

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map='auto', trust_remote_code=True)

# Configure LoRA
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=['q_proj', 'v_proj'],
    lora_dropout=0.05,
    bias='none',
    task_type=TaskType.CAUSAL_LM
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# Prepare datasets
print("\\n[4/6] Preparing datasets...")
from datasets import Dataset
train_dataset = Dataset.from_dict({'text': [str(x) for x in X_train], 'label': [str(y) for y in y_train]})
val_dataset = Dataset.from_dict({'text': [str(x) for x in X_val], 'label': [str(y) for y in y_val]})

def tokenize_function(examples):
    return tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)

train_dataset = train_dataset.map(tokenize_function, batched=True)
val_dataset = val_dataset.map(tokenize_function, batched=True)

# Train
print("\\n[5/6] Training...")
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=3,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    warmup_steps=100,
    logging_dir='./logs',
    logging_steps=10,
    eval_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    report_to='none'
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset
)

trainer.train()
print("Training complete!")

# Save
print("\\n[6/6] Saving model...")
model.save_pretrained('./fine_tuned_model')
tokenizer.save_pretrained('./fine_tuned_model')
print("Model saved!")

print("\\n" + "=" * 50)
print("TRAINING COMPLETE!")
print("=" * 50)
`
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { dataset_profile, training_target, constraints } = body
        
        const jobId = Math.random().toString(36).substring(2, 15)
        
        const job = {
            job_id: jobId,
            status: 'starting',
            config: { dataset_profile, training_target, constraints },
            started_at: new Date().toISOString(),
            progress: 0,
            logs: ['Job created, starting training...']
        }
        
        jobs.set(jobId, job)
        
        // Start training in background
        const trainingDir = join(process.cwd(), 'training_jobs', jobId)
        if (!existsSync(trainingDir)) {
            mkdirSync(trainingDir, { recursive: true })
        }
        
        const script = generateTrainingScript({ dataset_profile, training_target, constraints })
        const scriptPath = join(trainingDir, 'train.py')
        writeFileSync(scriptPath, script)
        
        // Update job status
        jobs.set(jobId, { ...job, status: 'running', script_path: scriptPath })
        
        // Start Python process
        const proc = spawn('python', [scriptPath], {
            cwd: trainingDir,
            stdio: ['ignore', 'pipe', 'pipe']
        })
        
        proc.stdout.on('data', (data) => {
            const log = data.toString()
            const currentJob = jobs.get(jobId)
            if (currentJob) {
                currentJob.logs.push(log)
                currentJob.progress = Math.min(currentJob.progress + 5, 95)
                jobs.set(jobId, currentJob)
            }
        })
        
        proc.stderr.on('data', (data) => {
            const log = data.toString()
            const currentJob = jobs.get(jobId)
            if (currentJob) {
                currentJob.logs.push(`ERROR: ${log}`)
                jobs.set(jobId, currentJob)
            }
        })
        
        proc.on('close', (code) => {
            const currentJob = jobs.get(jobId)
            if (currentJob) {
                currentJob.status = code === 0 ? 'completed' : 'failed'
                currentJob.progress = 100
                currentJob.completed_at = new Date().toISOString()
                jobs.set(jobId, currentJob)
            }
        })
        
        return NextResponse.json({
            job_id: jobId,
            status: 'started',
            message: 'Training started on local GPU'
        })
        
    } catch (error: any) {
        console.error('Training error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    
    if (!jobId) {
        return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
    }
    
    const job = jobs.get(jobId)
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    return NextResponse.json(job)
}
