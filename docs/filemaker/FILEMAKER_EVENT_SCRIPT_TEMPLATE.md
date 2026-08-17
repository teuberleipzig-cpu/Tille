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
  Commit Records/Requests [ With dialog: Off ]
  Set Variable [ $commitErrorSnapshot ; Value:
    JSONSetElement (
      "{}" ;
      [ "code" ; Get ( LastError ) ; JSONNumber ] ;
      [ "detail" ; Get ( LastErrorDetail ) ; JSONString ]
    )
  ]
  If [ JSONGetElement ( $commitErrorSnapshot ; "code" ) ≠ 0 ]
    Set Field [ Events::WebsiteLastError ;
      "WebsiteEventID konnte nicht gespeichert werden: " &
      JSONGetElement ( $commitErrorSnapshot ; "detail" )
    ]
    Show Custom Dialog [ "Website API Fehler" ; Events::WebsiteLastError ]
    Exit Script [ Text Result: "error" ]
  End If
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
  "--data @$requestJSON --show-error --max-time 30"
]

Insert from URL [ Select ; With dialog: Off ; Verify SSL Certificates ; Target: $response ;
  Settings::Website_API_URL ; cURL options: $curl ]

Set Variable [ $errorSnapshot ; Value:
  JSONSetElement (
    "{}" ;
    [ "code" ; Get ( LastError ) ; JSONNumber ] ;
    [ "detail" ; Get ( LastErrorDetail ) ; JSONString ]
  )
]
Set Variable [ $lastError ; Value: JSONGetElement ( $errorSnapshot ; "code" ) ]
Set Variable [ $lastErrorDetail ; Value: JSONGetElement ( $errorSnapshot ; "detail" ) ]

If [ $lastError ≠ 0 ]
  Set Field [ Events::WebsiteLastError ; $lastError & ": " & $lastErrorDetail ]
  Show Custom Dialog [ "Website API Fehler" ; Events::WebsiteLastError ]
  Exit Script [ Text Result: "error" ]
End If

Set Variable [ $workflowRunID ; Value: JSONGetElement ( $response ; "workflow_run_id" ) ]
Set Variable [ $workflowRunURL ; Value: JSONGetElement ( $response ; "html_url" ) ]
If [ IsEmpty ( $workflowRunID ) and IsEmpty ( $workflowRunURL ) ]
  Set Field [ Events::WebsiteLastError ;
    "GitHub hat den HTTP-Aufruf angenommen, aber keine erwartete Workflow-Run-Response geliefert."
  ]
  Show Custom Dialog [ "Website API Fehler" ; Events::WebsiteLastError ]
  Exit Script [ Text Result: "error" ]
End If

Set Field [ Events::WebsiteLastRunID ; $workflowRunID ]
Set Field [ Events::WebsiteLastRunURL ; $workflowRunURL ]
Set Field [ Events::WebsiteLastSentAt ; Get ( CurrentTimestamp ) ]
Set Field [ Events::WebsiteLastError ; "" ]
Show Custom Dialog [ "GitHub-Workflow wurde gestartet." ;
  "Der Workflow läuft jetzt. Das Ergebnis anschließend in GitHub Actions prüfen." &
  If ( IsEmpty ( $workflowRunURL ) ; "" ; "¶¶Run in GitHub Actions öffnen: " & $workflowRunURL )
]
```

`--data @$requestJSON` übergibt die FileMaker-Variable als Request-Body. **Verify SSL Certificates / SSL-Zertifikate verifizieren** ist im Insert-Schritt explizit aktiv; keine Option zum Abschalten der Zertifikatsprüfung verwenden. `--max-time 30` begrenzt den Netzwerkaufruf für das Meeting auf 30 Sekunden.

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
