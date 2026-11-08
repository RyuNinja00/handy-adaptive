#!/usr/bin/env bash
cd "$(dirname "$0")/trainer" && python3 trainer.py
read -rp "Press Enter to close..."
