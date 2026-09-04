{{/*
Full image reference: registry/repository:tag
*/}}
{{- define "billiard.image" -}}
{{- $reg := .global.registry -}}
{{- if $reg -}}{{- printf "%s/" $reg -}}{{- end -}}
{{- printf "%s:%s" .image.repository .image.tag -}}
{{- end -}}

{{/*
Common labels applied to every resource.
*/}}
{{- define "billiard.labels" -}}
app.kubernetes.io/name: billiard-tournaments
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/*
Selector labels (subset of above — used in matchLabels / selector).
*/}}
{{- define "billiard.selectorLabels" -}}
app.kubernetes.io/name: billiard-tournaments
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
