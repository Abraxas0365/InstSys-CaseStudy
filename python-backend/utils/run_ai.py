# backend/utils/run_ai.py
import sys
import json
from pathlib import Path
import os

# Change the working directory to the project's root
# This ensures that relative paths like "config/config.json" work correctly.
os.chdir(Path(__file__).resolve().parents[1])

# Add the current directory to the system path to allow importing AI.py
sys.path.append(str(Path(__file__).resolve().parent))

from AI import AIAnalyst

def main():
    """
    Initializes and runs the AI Analyst.
    """
    config_path = Path("config/config.json") # Use a relative path from the new working directory
    
    # 1. Load the configuration file
    if not config_path.exists():
        print(f"❌ FATAL: Config file not found at {config_path.resolve()}")
        return
    
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # 2. Get the execution mode from the loaded config
    execution_mode = config.get("execution_mode", "split")

    # 3. Define the list of MongoDB collections the AI is allowed to use
    collections = ["students"] # Add more collections if needed, e.g., ["students", "faculty"]

    print("\n🚀 Starting AI Analyst (now using MongoDB)...")
    
    # 4. Create the AIAnalyst instance, providing all required arguments
    ai = AIAnalyst(collections=collections, llm_config=config, execution_mode=execution_mode)

    # 5. Start the AI's interactive loop
    if hasattr(ai, "start_ai_analyst"):
        ai.start_ai_analyst()
    else:
        print("⚠️ AIAnalyst has no start_ai_analyst() method.")

if __name__ == "__main__":
    main()