import google.genai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    # Try finding it in the parent directory if not here
    load_dotenv("../.env.local")
    api_key = os.getenv("GOOGLE_API_KEY")

print(f"API Key found: {'Yes' if api_key else 'No'}")

if api_key:
    with open("results.txt", "w", encoding="utf-8") as f:
        try:
            client = genai.Client(api_key=api_key)
            f.write("Attempting to LIST models...\n")
            
            try:
                # Iterate over the paginated list response
                f.write("Found models:\n")
                for m in client.models.list():
                    f.write(f"- {m.name}\n")
            except Exception as e:
                f.write(f"Listing failed: {e}\n")
                
            f.write("\nTesting specific connectivity:\n")
            models_to_test = [
                "gemini-2.0-flash-exp", 
                "gemini-1.5-flash", 
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash-001"
            ]
            
            for model in models_to_test:
                f.write(f"Testing {model}...")
                try:
                    # Use a minimal generation config to be fast
                    response = client.models.generate_content(
                        model=model,
                        contents="Hi",
                    )
                    f.write(f"✅ OK\n")
                except Exception as e:
                    # Capture just the status/code part to be concise
                    msg = str(e)
                    if "404" in msg: f.write("❌ 404 Not Found\n")
                    elif "429" in msg: f.write("⚠️ 429 Quota Exceeded (Exists!)\n")
                    else: f.write(f"❌ Error: {msg[:50]}...\n")

        except Exception as e:
            f.write(f"Error initializing client: {e}\n")
else:
    print("Please check GOOGLE_API_KEY in .env.local")
