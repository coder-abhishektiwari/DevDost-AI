

# File: backend/agent/intent_classifier.py
"""
Production-ready Intent Classification System
Two-stage hybrid approach: Pattern Matching + LLM Fallback
"""

import re
from typing import Dict, List, Tuple, Optional

class IntentClassifier:
    """
    Production-ready intent classifier with multi-stage detection
    Stage 1: Pattern matching (fast, accurate for clear cases)
    Stage 2: LLM classification (for ambiguous cases)
    """
    
    # Keywords organized by intent
    INTENT_PATTERNS = {
        "NEW_PROJECT": {
            "keywords": [
                r"\b(bana|banao|create|new|naya)\b.*\b(project|app|website|game|calculator|todo)\b",
                r"\b(build|develop|make)\b.*\b(me|mujhe|for|a|an)\b",
                r"\bshuru\s+kar|start\s+(new|fresh)\b",
                r"\b(simple|basic)?\s*(calculator|todo|chat|weather|game|portfolio)\b\s*(bana|chahiye|create)",
            ],
            "exact_phrases": [
                "naya project", "new project", "project banao", "app banao",
                "website banao", "create app", "make something"
            ],
            "threshold": 0.7
        },
        
        "MODIFY_PROJECT": {
            "keywords": [
                r"\b(add|badlo|change|modify|update|edit|improve|fix|remove|delete)\b",
                r"\b(feature|functionality|color|button|design|style)\b.*\b(add|change|update)\b",
                r"\bisko\s+(badal|update|edit|improve|fix)\b",
                r"\b(bug|error|issue|problem)\s+(fix|solve|thik)\b",
                r"\b(isme|current|is\s+file)\b.*\b(change|add|remove|modify)\b"
            ],
            "exact_phrases": [
                "change karo", "add karo", "feature add", "bug fix",
                "improve kar", "update kar", "edit kar"
            ],
            "threshold": 0.6
        },
        
        "FILE_OPS": {
            "keywords": [
                r"\b(file|folder|directory)\b.*\b(create|delete|move|rename|show|list)\b",
                r"\b(read|write|open|close|save)\b.*\bfile\b",
                r"\bfiles?\s+(dikha|show|list|batao)\b",
                r"\b(kaunsi|which|what)\s+files?\b"
            ],
            "exact_phrases": [
                "file dikha", "show files", "list files", "file structure",
                "kaunsi files", "files batao"
            ],
            "threshold": 0.7
        },
        
        "PROJECT_SWITCH": {
            "keywords": [
                r"\b(switch|open|load|select)\b.*\bproject\b",
                r"\bproject\b.*\b(kholo|open|switch|change)\b",
                r"\b(dusre|another|other)\s+project\b",
                r"\b(isko|this|ye)\s+project\b.*\b(kholo|open)\b"
            ],
            "exact_phrases": [
                "project switch", "switch project", "open project",
                "project kholo", "dusra project"
            ],
            "threshold": 0.8
        },
        
        "PROJECT_LIST": {
            "keywords": [
                r"\b(kitne|how\s+many|saare|all|mere)\s+(projects?|apps?)\b",
                r"\bprojects?\s+(list|show|dikha|batao|hai|available)\b",
                r"\b(kya\s+kya|what\s+all)\b.*\b(bana|projects?|apps?)\b"
            ],
            "exact_phrases": [
                "projects dikha", "show projects", "list projects",
                "kitne projects", "saare projects", "mere projects",
                "project list", "kya kya banaya"
            ],
            "threshold": 0.6
        },
        
        "RUN_PROJECT": {
            "keywords": [
                r"\b(run|execute|start|launch|chala|chalao)\b.*\b(project|app|code)\b",
                r"\bproject\b.*\b(run|execute|start|chala)\b",
                r"\b(test|demo|preview)\b.*\b(kar|do|show)\b"
            ],
            "exact_phrases": [
                "run karo", "project run", "chala do", "execute karo",
                "start kar", "demo dikha"
            ],
            "threshold": 0.8
        },
        
        "CHAT": {
            "keywords": [
                r"\b(hello|hi|hey|namaste|kaise|how|aap|you|kon|who|kya|what)\b",
                r"\b(help|madad|batao|explain|samjha|sikha)\b",
                r"\b(owner|creator|kisne\s+banaya|made\s+by)\b",
                r"\b(capabilities|kya\s+kar\s+sakte|what\s+can)\b"
            ],
            "exact_phrases": [
                "hello", "hi", "hey", "aap kaun", "who are you",
                "kya kar sakte", "help me", "madad chahiye",
                "owner kaun", "kisne banaya"
            ],
            "threshold": 0.5
        }
    }
    
    # Contextual boost: if current_project exists, boost MODIFY intent
    CONTEXT_BOOST = {
        "has_project": {
            "MODIFY_PROJECT": 0.2,
            "FILE_OPS": 0.15,
            "RUN_PROJECT": 0.15
        },
        "no_project": {
            "NEW_PROJECT": 0.2,
            "PROJECT_LIST": 0.1
        }
    }
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize text for better matching"""
        text = text.lower().strip()
        # Remove extra spaces
        text = re.sub(r'\s+', ' ', text)
        return text
    
    @staticmethod
    def calculate_pattern_score(text: str, patterns: Dict) -> float:
        """Calculate confidence score based on pattern matching"""
        text = IntentClassifier.normalize_text(text)
        score = 0.0
        
        # Check exact phrases (high confidence)
        for phrase in patterns.get("exact_phrases", []):
            if phrase in text:
                score += 0.4
        
        # Check keyword patterns (medium confidence)
        for pattern in patterns.get("keywords", []):
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.3
        
        return min(score, 1.0)  # Cap at 1.0
    
    @staticmethod
    def apply_context_boost(scores: Dict[str, float], current_project: Optional[str]) -> Dict[str, float]:
        """Apply contextual boosting based on project state"""
        boost_key = "has_project" if current_project else "no_project"
        boosts = IntentClassifier.CONTEXT_BOOST[boost_key]
        
        for intent, boost in boosts.items():
            if intent in scores:
                scores[intent] = min(scores[intent] + boost, 1.0)
        
        return scores
    
    @staticmethod
    def stage1_pattern_matching(user_prompt: str, current_project: Optional[str]) -> Tuple[str, float]:
        """
        Stage 1: Fast pattern-based classification
        Returns: (intent, confidence_score)
        """
        scores = {}
        
        # Calculate scores for each intent
        for intent, patterns in IntentClassifier.INTENT_PATTERNS.items():
            score = IntentClassifier.calculate_pattern_score(user_prompt, patterns)
            if score >= patterns["threshold"]:
                scores[intent] = score
        
        # Apply context boosting
        scores = IntentClassifier.apply_context_boost(scores, current_project)
        
        # Get best match
        if scores:
            best_intent = max(scores.items(), key=lambda x: x[1])
            return best_intent
        
        return "UNKNOWN", 0.0
    
    @staticmethod
    def stage2_llm_classification(user_prompt: str, current_project: Optional[str], llm) -> str:
        """
        Stage 2: LLM-based classification for ambiguous cases
        Enhanced prompt with examples and strict output format
        """
        
        examples = """
Examples for clarity:

1. "hello" → CHAT
2. "calculator banao" → NEW_PROJECT
3. "button ka color change karo" → MODIFY_PROJECT
4. "files dikha" → FILE_OPS
5. "todo-app kholo" → PROJECT_SWITCH
6. "kitne projects hain" → PROJECT_LIST
7. "run karo" → RUN_PROJECT
8. "aap kaun ho" → CHAT
9. "red button add karo" → MODIFY_PROJECT
10. "naya game banao" → NEW_PROJECT
"""

        classifier_prompt = f"""You are an expert intent classifier for a coding assistant.

CONTEXT:
- Current project: {current_project or "No project selected"}
- User input: "{user_prompt}"

INTENT DEFINITIONS:
- NEW_PROJECT: User wants to create/build a new project, app, or website
- MODIFY_PROJECT: User wants to change/add/fix something in current project
- FILE_OPS: User wants file/folder operations (list, show, create files)
- PROJECT_SWITCH: User wants to switch/open a different project
- PROJECT_LIST: User wants to see list of available projects
- RUN_PROJECT: User wants to run/execute/test the project
- CHAT: General conversation, questions about you, greetings, help requests

{examples}

RULES:
1. If no project is selected and user asks to modify/change → NEW_PROJECT (not MODIFY_PROJECT)
2. "kya kya bana sakte ho" = CHAT (asking about capabilities)
3. "aap kaun ho", "owner", "kisne banaya" = CHAT
4. "kitne projects", "saare projects" = PROJECT_LIST
5. Focus on PRIMARY intent, ignore filler words

RESPOND WITH ONLY ONE WORD FROM: NEW_PROJECT, MODIFY_PROJECT, FILE_OPS, PROJECT_SWITCH, PROJECT_LIST, RUN_PROJECT, CHAT

Intent:"""

        try:
            response = llm.invoke(classifier_prompt)
            intent = response.content.strip().upper()
            
            valid_intents = ["NEW_PROJECT", "MODIFY_PROJECT", "FILE_OPS", "PROJECT_SWITCH", "PROJECT_LIST", "RUN_PROJECT", "CHAT"]
            
            if intent not in valid_intents:
                # Fallback: check if any valid intent is substring
                for valid_intent in valid_intents:
                    if valid_intent in intent:
                        return valid_intent
                return "CHAT"  # Default fallback
            
            return intent
            
        except Exception as e:
            print(f"⚠️ LLM classification failed: {e}")
            return "CHAT"
    
    @classmethod
    def classify(cls, user_prompt: str, current_project: Optional[str], llm) -> str:
        """
        Main classification method - uses two-stage approach
        """
        # Stage 1: Pattern matching (fast)
        intent, confidence = cls.stage1_pattern_matching(user_prompt, current_project)
        
        # If high confidence (>0.7), return immediately
        if confidence >= 0.7:
            print(f"✅ Pattern match: {intent} (confidence: {confidence:.2f})")
            return intent
        
        # Stage 2: LLM classification for ambiguous cases
        print(f"🔄 Low confidence ({confidence:.2f}), using LLM...")
        intent = cls.stage2_llm_classification(user_prompt, current_project, llm)
        print(f"✅ LLM classified: {intent}")
        
        return intent


def chat_classifier_agent(state: dict) -> dict:
    """
    Enhanced classifier with two-stage detection
    - Stage 1: Fast pattern matching (70% accuracy, instant)
    - Stage 2: LLM fallback (high accuracy, slower)
    """
    saved_callback = state.get("_emit_progress")
    state = normalize_state(state)

    if saved_callback is not None:
        state["_emit_progress"] = saved_callback

    try:
        user_prompt = state["user_prompt"]
        current_project = state.get("current_project")

        # Use two-stage classifier
        intent = IntentClassifier.classify(user_prompt, current_project, llm_fast)

        state["chat_history"].append({"role": "user", "content": user_prompt})

        print(f"🎯 Final Intent: {intent}")
        return {
            **state,
            "intent": intent,
            "_emit_progress": saved_callback
        }

    except Exception as e:
        print(f"❌ Classifier error: {e}")
        return {
            **state,
            "intent": "CHAT",
            "_emit_progress": saved_callback
        }