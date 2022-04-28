package user

var (
	User *user
)

func Init() {
	User = NewUser()
	return
}
