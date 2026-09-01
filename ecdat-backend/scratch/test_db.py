import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:Akhil%40dps123%21@db.dyzbherlcrnynqewcboe.supabase.co:5432/postgres"

async def test():
    engine = create_async_engine(DATABASE_URL)
    try:
        async with engine.begin() as conn:
            print("Successfully connected to DB!")
    except Exception as e:
        print(f"Failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test())
