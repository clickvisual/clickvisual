package view

type ReqCreateIndex struct {
	Tid  int         `json:"tid" form:"tid"`
	Data []IndexItem `json:"data"`
}

type IndexItem struct {
	Field string `json:"field" form:"field"`
	Alias string `json:"alias" form:"alias"`
	Typ   int    `json:"typ" form:"typ"`
}
