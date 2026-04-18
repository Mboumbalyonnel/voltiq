# =============================================================================
# VoltIQ — Fine-tuning Mistral 7B avec LoRA sur Google Colab
# Exécuter dans l'ordre sur Google Colab avec GPU T4 (Runtime > GPU)
# =============================================================================

# CELLULE 1 : Installation
# !pip install -q transformers datasets peft trl bitsandbytes accelerate huggingface_hub sentencepiece

# CELLULE 2 : Configuration
HF_TOKEN    = "hf_VOTRE_TOKEN_ICI"
HF_USERNAME = "votre_username"
MODEL_NAME  = "mistralai/Mistral-7B-v0.1"

import json, torch
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model, TaskType
from trl import SFTTrainer
from huggingface_hub import login

login(token=HF_TOKEN)
print("Connecte a Hugging Face.")

# CELLULE 3 : Chargement dataset
with open("voltiq_dataset.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

def format_prompt(sample):
    return {"text": f"<s>[INST] {sample['instruction']} [/INST] {sample['response']} </s>"}

dataset = Dataset.from_list([format_prompt(d) for d in raw_data])
print(f"Dataset charge : {len(dataset)} exemples")

# CELLULE 4 : Modele en 4-bit (QLoRA)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model.config.use_cache = False
print("Modele charge en 4-bit.")

# CELLULE 5 : Configuration LoRA
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# CELLULE 6 : Parametres d'entrainement
training_args = TrainingArguments(
    output_dir="./voltiq-mistral-lora",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    gradient_checkpointing=True,
    learning_rate=2e-4,
    weight_decay=0.001,
    fp16=True,
    logging_steps=10,
    save_steps=50,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    report_to="none",
    optim="paged_adamw_8bit",
)

# CELLULE 7 : Entrainement (45 a 90 min sur Colab T4)
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=512,
    tokenizer=tokenizer,
    args=training_args,
    packing=False,
)
print("Demarrage de l'entrainement...")
trainer.train()
print("Entrainement termine.")

# CELLULE 8 : Sauvegarde et push Hugging Face
REPO_NAME = f"{HF_USERNAME}/voltiq-mistral-7b"
trainer.model.save_pretrained("voltiq-mistral-lora-final")
tokenizer.save_pretrained("voltiq-mistral-lora-final")
trainer.model.push_to_hub(REPO_NAME, token=HF_TOKEN)
tokenizer.push_to_hub(REPO_NAME, token=HF_TOKEN)
print(f"Modele publie sur : https://huggingface.co/{REPO_NAME}")

# CELLULE 9 : Test
from transformers import pipeline
pipe = pipeline("text-generation", model="voltiq-mistral-lora-final", tokenizer=tokenizer, max_new_tokens=256, temperature=0.7, device_map="auto")

def tester(question):
    prompt = f"<s>[INST] {question} [/INST]"
    result = pipe(prompt)[0]["generated_text"]
    reponse = result.split("[/INST]")[-1].strip()
    print(f"Q: {question}\nR: {reponse}\n{'-'*60}")

tester("Combien coute 1 kWh en tranche T3 STEG ?")
tester("qdach teklef essakhana fel chahr ?")
tester("Comment reduire ma facture STEG de 30% ?")
