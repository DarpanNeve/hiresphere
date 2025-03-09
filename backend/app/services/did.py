import httpx
from app.core.config import settings

async def create_avatar_video(question: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.d-id.com/talks",
            headers={
                "Authorization": f"Basic {settings.DID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "script": {
                    "type": "text",
                    "input": question,
                },
                "source_url": "https://create-images-results.d-id.com/DefaultPresenters/Emma_f/image.jpeg",
            },
        )
        
        if response.status_code == 201:
            result = response.json()
            return result["result_url"]
        else:
            raise Exception("Failed to create avatar video")