package audit

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"
)

// AuditLogger defines the interface for cryptographic logging
type AuditLogger interface {
	LogEvent(eventData string) (string, error)
	GetMerkleRoot() string
}

// VeritasChain implements a simple Merkle-based audit log
type VeritasChain struct {
	mu     sync.Mutex
	hashes []string
}

func NewVeritasChain() *VeritasChain {
	return &VeritasChain{
		hashes: []string{},
	}
}

// LogEvent hashes an event and adds it to the chain
func (vc *VeritasChain) LogEvent(eventData string) (string, error) {
	vc.mu.Lock()
	defer vc.mu.Unlock()

	hash := sha256.Sum256([]byte(eventData))
	hashStr := hex.EncodeToString(hash[:])

	vc.hashes = append(vc.hashes, hashStr)
	fmt.Printf("📝 Audit Log (VCP): %s\n", hashStr)

	return hashStr, nil
}

// GetMerkleRoot calculates the root of the current event hashes
func (vc *VeritasChain) GetMerkleRoot() string {
	vc.mu.Lock()
	defer vc.mu.Unlock()

	if len(vc.hashes) == 0 {
		return ""
	}

	tempHashes := make([]string, len(vc.hashes))
	copy(tempHashes, vc.hashes)

	for len(tempHashes) > 1 {
		var nextLevel []string
		for i := 0; i < len(tempHashes); i += 2 {
			if i+1 < len(tempHashes) {
				combined := tempHashes[i] + tempHashes[i+1]
				hash := sha256.Sum256([]byte(combined))
				nextLevel = append(nextLevel, hex.EncodeToString(hash[:]))
			} else {
				// Odd number of hashes, promote the last one
				nextLevel = append(nextLevel, tempHashes[i])
			}
		}
		tempHashes = nextLevel
	}

	return tempHashes[0]
}
