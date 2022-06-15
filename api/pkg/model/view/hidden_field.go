package view

type HiddenFieldCreate struct {
	Fields []string `json:"fields" binding:"required"`
}
