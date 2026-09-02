package main
import "crypto/rsa"
import "crypto/rand"
import "crypto/sha1"

func main() {
    key, _ := rsa.GenerateKey(rand.Reader, 2048)
    hash := sha1.New()
}
