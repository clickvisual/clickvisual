package view

type (
	ReqEventList struct {
		Source    string `json:"source" form:"source"`
		Operation string `json:"operation" form:"operation"`
		Uid       int    `json:"uid" form:"uid"`
		Pagination
	}
)
