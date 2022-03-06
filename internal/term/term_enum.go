// Code generated by go-enum DO NOT EDIT.

package term

import (
	"fmt"
	"strings"
)

const (
	// Log is a updateKind of type Log.
	Log updateKind = iota
	// Error is a updateKind of type Error.
	Error
	// Ready is a updateKind of type Ready.
	Ready
	// Restarted is a updateKind of type Restarted.
	Restarted
)

const _updateKindName = "logerrorreadyrestarted"

var _updateKindNames = []string{
	_updateKindName[0:3],
	_updateKindName[3:8],
	_updateKindName[8:13],
	_updateKindName[13:22],
}

// updateKindNames returns a list of possible string values of updateKind.
func updateKindNames() []string {
	tmp := make([]string, len(_updateKindNames))
	copy(tmp, _updateKindNames)
	return tmp
}

var _updateKindMap = map[updateKind]string{
	0: _updateKindName[0:3],
	1: _updateKindName[3:8],
	2: _updateKindName[8:13],
	3: _updateKindName[13:22],
}

// String implements the Stringer interface.
func (x updateKind) String() string {
	if str, ok := _updateKindMap[x]; ok {
		return str
	}
	return fmt.Sprintf("updateKind(%d)", x)
}

var _updateKindValue = map[string]updateKind{
	_updateKindName[0:3]:                    0,
	strings.ToLower(_updateKindName[0:3]):   0,
	_updateKindName[3:8]:                    1,
	strings.ToLower(_updateKindName[3:8]):   1,
	_updateKindName[8:13]:                   2,
	strings.ToLower(_updateKindName[8:13]):  2,
	_updateKindName[13:22]:                  3,
	strings.ToLower(_updateKindName[13:22]): 3,
}

// ParseupdateKind attempts to convert a string to a updateKind
func ParseupdateKind(name string) (updateKind, error) {
	if x, ok := _updateKindValue[name]; ok {
		return x, nil
	}
	return updateKind(0), fmt.Errorf("%s is not a valid updateKind, try [%s]", name, strings.Join(_updateKindNames, ", "))
}

// MarshalText implements the text marshaller method
func (x updateKind) MarshalText() ([]byte, error) {
	return []byte(x.String()), nil
}

// UnmarshalText implements the text unmarshaller method
func (x *updateKind) UnmarshalText(text []byte) error {
	name := string(text)
	tmp, err := ParseupdateKind(name)
	if err != nil {
		return err
	}
	*x = tmp
	return nil
}
