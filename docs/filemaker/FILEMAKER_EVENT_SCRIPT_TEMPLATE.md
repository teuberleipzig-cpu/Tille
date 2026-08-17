# FileMaker Script Template — Website – Event API

Alle `Events::...`- und `Settings::...`-Namen sind Platzhalter und werden beim Meeting an das reale Schema angepasst.

## Scriptparameter

```text
validate-only|upsert
sync-pr|upsert
sync-pr|remove
```

## Scriptablauf

```text
Set Error Capture [ On ]
Allow User Abort [ Off ]

Set Variable [ $parts ; Value: Substitute ( Get ( ScriptParameter ) ; "|" ; "¶" ) ]
Set Variable [ $mode ; Value: GetValue ( $parts ; 1 ) ]
Set Variable [ $operation ; Value: GetValue ( $parts ; 2 ) ]

If [ IsEmpty ( Events::WebsiteEventID ) ]
  Set Field [ Events::WebsiteEventID ; Get ( UUID ) ]
End If

Set Variable [ $eventID ; Value: "fm-" & Lower ( Events::WebsiteEventID ) ]
Set Variable [ $isoDate ; Value:
  Year ( Events::Datum ) & "-" &
  Right ( "0" & Month ( Events::Datum ) ; 2 ) & "-" &
  Right ( "0" & Day ( Events::Datum ) ; 2 )
]

If [ $operation = "remove" ]
  Set Variable [ $eventJSON ; Value:
    JSONSetElement ( "{}" ; [ "id" ; $eventID ; JSONString ] )
  ]
Else
  Set Variable [ $eventJSON ; Value:
    JSONSetElement (
      "{}" ;
      [ "id" ; $eventID ; JSONString ] ;
      [ "date" ; $isoDate ; JSONString ] ;
      [ "title" ; Events::Titel ; JSONString ] ;
      [ "color" ; If ( IsEmpty ( Events::Farbe ) ; "orange" ; Events::Farbe ) ; JSONString ] ;
      [ "moreUrl" ; Events::MehrInfosURL ; JSONString ] ;
      [ "imageUrl" ; Events::BildURL ; JSONString ] ;
      [ "description" ; Events::Beschreibung ; JSONString ] ;
      [ "sections" ; "[]" ; JSONArray ]
    )
  ]
End If

Set Variable [ $inputsJSON ; Value:
  JSONSetElement (
    "{}" ;
    [ "mode" ; $mode ; JSONString ] ;
    [ "operation" ; $operation ; JSONString ] ;
    [ "event_json" ; $eventJSON ; JSONString ]
  )
]

Set Variable [ $requestJSON ; Value:
  JSONSetElement (
    "{}" ;
    [ "ref" ; If ( IsEmpty ( Settings::Website_API_Ref ) ; "main" ; Settings::Website_API_Ref ) ; JSONString ] ;
    [ "inputs" ; $inputsJSON ; JSONObject ]
  )
]

Set Variable [ $curl ; Value:
  "--request POST " &
  "--header " & Quote ( "Accept: application/vnd.github+json" ) & " " &
  "--header " & Quote ( "Authorization: Bearer " & Settings::Website_API_Token ) & " " &
  "--header " & Quote ( "X-GitHub-Api-Version: 2026-03-10" ) & " " &
  "--header " & Quote ( "Content-Type: application/json" ) & " " &
  "--data @$requestJSON --show-error"
]

Insert from URL [ Select ; With dialog: Off ; Target: $response ;
  Settings::Website_API_URL ; cURL options: $curl ]

Set Variable [ $lastError ; Value: Get ( LastError ) ]
Set Variable [ $lastErrorDetail ; Value: Get ( LastErrorDetail ) ]

If [ $lastError ≠ 0 ]
  Set Field [ Events::WebsiteLastError ; $lastError & ": " & $lastErrorDetail ]
  Show Custom Dialog [ "Website API Fehler" ; Events::WebsiteLastError ]
  Exit Script [ Text Result: "error" ]
End If

Set Field [ Events::WebsiteLastError ; "" ]
Set Field [ Events::WebsiteLastSentAt ; Get ( CurrentTimestamp ) ]
Set Field [ Events::WebsiteLastRunID ; JSONGetElement ( $response ; "workflow_run_id" ) ]
Set Field [ Events::WebsiteLastRunURL ; JSONGetElement ( $response ; "html_url" ) ]
Show Custom Dialog [ "Dispatch angenommen" ; "GitHub Actions jetzt öffnen und den Lauf prüfen." ]
```

`--data @$requestJSON` übergibt die FileMaker-Variable als Request-Body. SSL-Verifikation bleibt aktiv; keine Option zum Abschalten der Zertifikatsprüfung verwenden.

## Erweiterte Sections

Für die zweite Ausbaustufe wird ein echtes JSON-Array aufgebaut und bei `sections` als `JSONArray` eingesetzt:

```json
[
  {
    "label": "line-up:",
    "genre": "",
    "items": [
      { "name": "<artist>", "info": "<label/city>", "link": "https://..." }
    ]
  }
]
```

Die Schleife durch Steffens Line-up-Relation wird erst nach Sichtung seiner tatsächlichen Tabellen, Portale und Feldnamen ergänzt. Bis dahin bleibt die nachweisbar funktionierende Minimalvariante `sections: []`.
