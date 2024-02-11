package export

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/davecgh/go-spew/spew"
	"github.com/pkg/errors"
)

type Kind struct {
	Name   string
	Keys   []string
	keys   map[string]struct{}
	Scopes map[string]*Scope
}

type Scope struct {
	ID         string
	Attributes map[string]*Attribute
}

type Attribute struct {
	Key      string
	IsVector bool
	Value    string
	Values   []string
	Last     string
}

func prepare(tajfile string) ([]*Kind, error) {
	file, err := os.Open(tajfile)
	if err != nil {
		return nil, errors.Wrap(err, "open tajriba file")
	}
	defer file.Close()

	kinds := make(map[string]*Kind)
	scopeKinds := make(map[string]*Kind)

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()

		var data map[string]interface{}
		if err := json.Unmarshal([]byte(line), &data); err != nil {
			return nil, errors.Wrap(err, "parse tajriba file")
		}

		switch data["kind"] {
		case "Scope":
			obj := data["obj"].(map[string]interface{})

			id := obj["id"].(string)
			k := obj["kind"].(string)

			kind, ok := kinds[obj["kind"].(string)]

			if ok {
				if _, ok := kind.Scopes[id]; ok {
					return nil, errors.New("scope already exists")
				}

				kind.Scopes[id] = &Scope{
					ID:         id,
					Attributes: make(map[string]*Attribute),
				}
			} else {
				kinds[obj["kind"].(string)] = &Kind{
					Name: k,
					Keys: make([]string, 0),
					keys: make(map[string]struct{}),
					Scopes: map[string]*Scope{
						id: {
							ID:         id,
							Attributes: make(map[string]*Attribute),
						},
					},
				}
			}

			scopeKinds[obj["id"].(string)] = kinds[obj["kind"].(string)]
		case "Attribute":
			obj := data["obj"].(map[string]interface{})

			key := obj["key"].(string)
			val := cast(obj["val"].(string))
			createdAt := obj["createdAt"].(string)
			vector, _ := obj["vector"].(bool)
			indexf, hasIndex := obj["index"].(float64)
			index := int(indexf)

			if vector && !hasIndex {
				spew.Dump(data)

				return nil, errors.New("vector without index")
			}

			if strings.HasPrefix(key, "ran-on-") ||
				strings.HasPrefix(key, "ran-before-") ||
				strings.HasPrefix(key, "ran-after-") ||
				strings.HasPrefix(key, "playerGameID-") ||
				strings.HasPrefix(key, "playerRoundID-") ||
				strings.HasPrefix(key, "playerStageID-") {
				continue
			}

			nodeID := obj["nodeID"].(string)

			kind, ok := scopeKinds[nodeID]
			if !ok {
				return nil, errors.New("scope not found")
			}

			kind.keys[key] = struct{}{}

			attr, ok := kind.Scopes[nodeID].Attributes[key]
			if ok {
				if attr.IsVector {
					if index+1 > len(attr.Values) {
						attr.Values = append(attr.Values, make([]string, index+1-len(attr.Values))...)
					}

					attr.Values[index] = val
				} else {
					attr.Value = val
				}
				attr.Last = createdAt
			} else {
				attr = &Attribute{
					Key:      key,
					IsVector: vector,
					Last:     createdAt,
				}

				if attr.IsVector {
					attr.Values = []string{val}
				} else {
					attr.Value = val
				}

				kind.Scopes[nodeID].Attributes[key] = attr
			}
		default:
			// fmt.Printf("Else: %+v\n", data)
			continue
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, errors.Wrap(err, "read tajriba file")
	}

	kindNames := make([]string, 0, len(kinds))

	for name := range kinds {
		kindNames = append(kindNames, name)
	}

	sort.StringSlice(kindNames).Sort()

	k := make([]*Kind, 0, len(kindNames))

	for _, kindName := range kindNames {
		kind := kinds[kindName]

		kind.Keys = make([]string, 0, len(kind.keys))

		for key := range kind.keys {
			kind.Keys = append(kind.Keys, key)
		}

		kind.keys = nil

		sort.StringSlice(kind.Keys).Sort()

		k = append(k, kind)
	}

	return k, nil
}

func cast(val string) string {
	var v interface{}

	err := json.Unmarshal([]byte(val), &v)
	if err != nil {
		fmt.Printf("err: %s, val: %+v\n", err.Error(), val)
		return val
	}

	switch t := v.(type) {
	case string:
		return t
	case float64:
		if t == float64(int(t)) {
			return fmt.Sprintf("%d", int(t))
		}

		return fmt.Sprintf("%f", t)
	case int:
		return fmt.Sprintf("%d", t)
	case bool:
		return fmt.Sprintf("%t", t)
	default:
		return val
	}
}

func camelCase(s string) string {
	if s == "" {
		return s
	}

	return strings.ToLower(s[:1]) + s[1:]
}
