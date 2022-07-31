package treatments

type FactorValue struct {
	Name  string      `json:"name,omitempty" yaml:"name,omitempty"`
	Value interface{} `validate:"required" json:"value" yaml:"value"`
}

type Factor struct {
	Name   string         `validate:"required,gt=0,alphanumunicode" json:"name" yaml:"name"`
	Desc   string         `json:"desc,omitempty" yaml:"desc,omitempty"`
	Values []*FactorValue `json:"values" yaml:"values"`
}

type Treatment struct {
	Name    string                 `json:"name,omitempty" yaml:"name,omitempty"`
	Desc    string                 `json:"desc,omitempty" yaml:"desc,omitempty"`
	Factors map[string]interface{} `validate:"required,dive,keys,gt=0,alphanumunicode,endKeys" validate:"required" json:"factors" yaml:"factors"`
}

type Treatments struct {
	Factors    []*Factor    `validate:"dive" json:"factors" yaml:"factors"`
	Treatments []*Treatment `validate:"dive" json:"treatments" yaml:"treatments"`
}
