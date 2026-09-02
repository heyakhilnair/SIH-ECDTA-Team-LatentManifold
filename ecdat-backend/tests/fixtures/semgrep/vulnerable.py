import hashlib
from Crypto.PublicKey import RSA

def run():
    key = RSA.generate(2048)
    h = hashlib.md5(b"test")
