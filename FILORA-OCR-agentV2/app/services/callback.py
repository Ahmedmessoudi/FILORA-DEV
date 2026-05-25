import httpx
import logging
import asyncio
from typing import Dict, Any

logger = logging.getLogger("ocr_callback")

class CallbackService:
    @staticmethod
    async def send_callback(backend_url: str, payload: Dict[str, Any], retries: int = 5, backoff_factor: float = 1.5):
        """
        Sends the OCR result back to the Spring Boot backend asynchronously with retry logic.
        """
        url = f"{backend_url.rstrip('/')}/api/internal/ocr-callback"
        
        async with httpx.AsyncClient() as client:
            delay = 1.0
            for attempt in range(retries):
                try:
                    logger.info(f"Sending callback to {url} (Attempt {attempt + 1}/{retries})")
                    # Set a robust timeout
                    response = await client.post(url, json=payload, timeout=10.0)
                    
                    if response.is_success:
                        logger.info(f"Callback delivered successfully to {url}!")
                        return True
                    else:
                        logger.warning(f"Callback returned status code {response.status_code}: {response.text}")
                except Exception as e:
                    logger.error(f"Callback delivery failed due to network error: {str(e)}")
                
                if attempt < retries - 1:
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
            
            logger.critical(f"Failed to deliver callback to {url} after {retries} attempts.")
            return False
