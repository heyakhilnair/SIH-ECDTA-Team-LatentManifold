import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.models.job import DiscoveryJob
from app.config import settings

async def main():
    engine = create_async_engine(settings.database_url, connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0})
    AsyncSessionLocal = async_sessionmaker(bind=engine)
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(DiscoveryJob).where(DiscoveryJob.id == '4c37f4ec-129e-43dd-a1be-76f62abaf0d3'))
        job = res.scalars().first()
        if job:
            print("Error Message:", job.error_msg)
        else:
            print("Job not found")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
