package utils

import "math/rand"

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func RandomString(length int) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// PhoneSensitiveInfoRemove ...
func PhoneSensitiveInfoRemove(phone string) string {
	if len(phone) != 11 {
		return phone
	}
	return phone[0:3] + "****" + phone[7:11]
}
