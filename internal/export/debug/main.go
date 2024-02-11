package main

import (
	"bufio"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "csv" {
		parseCSV()
	} else {
		parseJSON()
	}
}

func parseCSV() {
	r := csv.NewReader(os.Stdin)

	count := 0
	countuniq := 0
	uniq := make(map[string]struct{})
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatal(err)
		}

		count++

		if count == 1 {
			continue
		}

		val := record[15]

		if val == "" {
			continue
		}

		// fmt.Printf("%09d - %+v\n", count, val)

		if _, ok := uniq[val]; ok {
			log.Printf("duplicate key: %d %s", count, val)

			continue
		}

		countuniq++

		uniq[val] = struct{}{}

		// Print data:
		// fmt.Printf("%09d - %+v\n", count, obj["val"])
	}

	fmt.Printf("count: %d\n", count)
	fmt.Printf("countuniq: %d\n", countuniq)
}

func parseJSON() {
	// Read stdin by line:
	scanner := bufio.NewScanner(os.Stdin)

	count := 1
	for scanner.Scan() {
		line := scanner.Text()

		// Parse json:
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(line), &data); err != nil {
			log.Fatalf("error parsing json: %v", err)
		}

		if data["kind"] != "Attribute" {
			continue
		}

		obj := data["obj"].(map[string]interface{})

		if obj["key"] != "participantIdentifier" {
			continue
		}

		// Print data:
		fmt.Printf("%09d - %+v\n", count, obj["val"])
		count++
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("error reading standard input: %v", err)
	}
}
