package lobbies

import "time"

type LobbyConfig struct {
	Name        string        `json:"name,omitempty" yaml:"name,omitempty"`
	Description string        `json:"desc,omitempty" yaml:"desc,omitempty"`
	Kind        string        `validate:"oneof=shared individual" json:"kind" yaml:"kind"`
	Duration    time.Duration `validate:"min=5s" json:"duration" yaml:"duration"`
	Strategy    string        `validate:"required_if=Kind shared,oneof=fail ignore" json:"strategy,omitempty" yaml:"strategy,omitempty"`
	Extensions  int           `validate:"required_if=Kind individual,min=0" json:"strategy,omitempty" yaml:"strategy,omitempty"`
}

type Lobbies struct {
	Lobbies []*LobbyConfig `validate:"dive" json:"lobbies" yaml:"lobbiew"`
}
