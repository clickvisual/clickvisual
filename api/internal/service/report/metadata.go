package report

import (
	"fmt"
	"sort"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	sourcesvc "github.com/clickvisual/clickvisual/api/internal/service/source"
	"github.com/ego-component/egorm"
)

func ListSourceInstances() ([]view.RespReportSourceInstance, error) {
	return defaultService.ListSourceInstances()
}

func (s *Service) ListSourceInstances() ([]view.RespReportSourceInstance, error) {
	if s.useDB() {
		return s.listSourceInstancesFromDB()
	}
	return []view.RespReportSourceInstance{
		{ID: 1, Name: "生产 ClickHouse", Desc: "本地测试实例"},
	}, nil
}

func ListSourceDatabases(instanceID int) ([]view.RespReportSourceDatabase, error) {
	return defaultService.ListSourceDatabases(instanceID)
}

func (s *Service) ListSourceDatabases(instanceID int) ([]view.RespReportSourceDatabase, error) {
	if s.useDB() {
		return s.listSourceDatabasesFromDB(instanceID)
	}
	return []view.RespReportSourceDatabase{{Name: "default"}}, nil
}

func ListSourceTables(instanceID int, database string) ([]view.RespReportSourceTable, error) {
	return defaultService.ListSourceTables(instanceID, database)
}

func (s *Service) ListSourceTables(instanceID int, database string) ([]view.RespReportSourceTable, error) {
	if s.useDB() {
		return s.listSourceTablesFromDB(instanceID, database)
	}
	return []view.RespReportSourceTable{{Name: "logs"}}, nil
}

func ListTableColumns(instanceID int, database, table string) ([]view.Column, error) {
	return defaultService.ListTableColumns(instanceID, database, table)
}

func (s *Service) ListTableColumns(instanceID int, database, table string) ([]view.Column, error) {
	if s.useDB() {
		return s.listTableColumnsFromDB(instanceID, database, table)
	}
	return []view.Column{
		{Field: "event_time", Type: "DateTime"},
		{Field: "level", Type: "String"},
		{Field: "trace_id", Type: "String"},
	}, nil
}

func (s *Service) listTableColumnsFromDB(instanceID int, database, table string) ([]view.Column, error) {
	operator, err := s.sourceOperatorFromDB(instanceID)
	if err != nil {
		return nil, err
	}
	return operator.Columns(database, table)
}

func (s *Service) listSourceInstancesFromDB() ([]view.RespReportSourceInstance, error) {
	rows, err := dbmodel.InstanceList(egorm.Conds{"datasource": dbmodel.DatasourceClickHouse})
	if err != nil {
		return nil, err
	}
	resp := make([]view.RespReportSourceInstance, 0, len(rows))
	for _, row := range rows {
		resp = append(resp, view.RespReportSourceInstance{
			ID:   row.ID,
			Name: row.Name,
			Desc: row.Desc,
		})
	}
	sort.Slice(resp, func(i, j int) bool {
		return resp[i].Name < resp[j].Name
	})
	return resp, nil
}

func (s *Service) listSourceDatabasesFromDB(instanceID int) ([]view.RespReportSourceDatabase, error) {
	operator, err := s.sourceOperatorFromDB(instanceID)
	if err != nil {
		return nil, err
	}
	names, err := operator.Databases()
	if err != nil {
		return nil, err
	}
	resp := make([]view.RespReportSourceDatabase, 0, len(names))
	for _, name := range names {
		resp = append(resp, view.RespReportSourceDatabase{Name: name})
	}
	sort.Slice(resp, func(i, j int) bool {
		return resp[i].Name < resp[j].Name
	})
	return resp, nil
}

func (s *Service) listSourceTablesFromDB(instanceID int, database string) ([]view.RespReportSourceTable, error) {
	operator, err := s.sourceOperatorFromDB(instanceID)
	if err != nil {
		return nil, err
	}
	names, err := operator.Tables(database)
	if err != nil {
		return nil, err
	}
	resp := make([]view.RespReportSourceTable, 0, len(names))
	for _, name := range names {
		resp = append(resp, view.RespReportSourceTable{Name: name})
	}
	sort.Slice(resp, func(i, j int) bool {
		return resp[i].Name < resp[j].Name
	})
	return resp, nil
}

func (s *Service) sourceOperatorFromDB(instanceID int) (sourcesvc.Operator, error) {
	if instanceID == 0 {
		return nil, fmt.Errorf("instanceId 不能为空")
	}
	instance, err := dbmodel.InstanceInfo(invoker.Db, instanceID)
	if err != nil {
		return nil, err
	}
	operator := sourcesvc.Instantiate(&sourcesvc.Source{
		DSN: instance.GetDSN(),
		Typ: dbmodel.Datasource2IntORM[instance.Datasource],
	})
	if operator == nil {
		return nil, fmt.Errorf("unsupported datasource: %s", instance.Datasource)
	}
	return operator, nil
}
