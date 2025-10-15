import json
import os
import requests
import chromadb #type: ignore
from typing import Dict, Any, List
from utils.System import SmartStudentDataSystem
from utils.Restrict import DataLoader
from pathlib import Path

def collect_data(path, role, assign, load = False):
    ai = SmartStudentDataSystem()
    if load:
        ai.Autoload_new_data()
    loader = DataLoader(path, silent=False)
    file_path = loader.load_data(role=role, assign=assign)
    ai.retrieve_metadata(file_path)
    return ai.restricted_collections

