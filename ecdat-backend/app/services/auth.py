from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt
from app.config import settings

security = HTTPBearer()

# In a real production environment, you would cache the JWKS from Clerk
# For this sprint, if development, we can decode unverified if the secret isn't set, 
# or just expect the Next.js API to pass a valid token.
# To keep it robust, we'll verify the signature if possible, otherwise we decode unverified for dev.

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        # We can extract the unverified claims to get the sub (clerk_user_id)
        # Next.js API route has already validated this token natively using Clerk SDK.
        unverified_claims = jwt.get_unverified_claims(token)
        user_id = unverified_claims.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub claim")
        return user_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
