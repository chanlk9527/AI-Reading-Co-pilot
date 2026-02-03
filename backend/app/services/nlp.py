import spacy

nlp = None

def init_spacy():
    global nlp
    try:
        nlp = spacy.blank("en")
        nlp.add_pipe("sentencizer")
        print("✅ Spacy Sentencizer loaded.")
    except Exception as e:
        print(f"❌ Failed to load Spacy: {e}")
        nlp = None

def sentencize(text: str):
    if nlp:
        doc = nlp(text)
        return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    return []
