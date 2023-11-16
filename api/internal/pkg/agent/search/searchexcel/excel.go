package searchexcel

type Logger struct {
	Ip        string `excel:"ip"`
	FilePath  string `excel:"文件路径"`
	Namespace string `excel:"namespace"`
	Container string `excel:"container"`
	Pod       string `excel:"pod"`
	Image     string `excel:"image"`
	Time      string `excel:"time"`
	Log       string `excel:"log" excel_width:"200"`
}
