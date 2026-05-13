## MedVerify — ML Pipeline

### Setup
pip install -r requirements.txt
python -m spacy download en_core_web_sm

### Run Order
1. python generate_registry.py   # creates mock MDCN registry
2. python generate_dataset.py    # generates credential images
3. python nlp_pipeline.py        # tests NLP extraction
4. python cv_pipeline.py         # trains CV model
5. uvicorn api:app --reload --port 8000  # starts the API

### API
POST /verify  — send credential image, get trust score back
Docs: http://localhost:8000/docs