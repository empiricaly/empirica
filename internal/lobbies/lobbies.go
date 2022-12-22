package lobbies

import "time"

type LobbyConfig struct {
	Name        string        `json:"name,omitempty" yaml:"name,omitempty"`
	Description string        `json:"desc,omitempty" yaml:"desc,omitempty"`
	Kind        string        `validate:"required,oneof=shared individual" json:"kind" yaml:"kind"`
	Duration    time.Duration `validate:"required,min=5s" json:"duration" yaml:"duration"`
	Strategy    string        `validate:"required_if=Kind shared,oneof=fail ignore ''" json:"strategy,omitempty" yaml:"strategy,omitempty"`
	Extensions  int           `validate:"min=0" json:"extensions,omitempty" yaml:"extensions,omitempty"`
}

type Lobbies struct {
	Lobbies []*LobbyConfig `validate:"dive" json:"lobbies" yaml:"lobbies"`
}
