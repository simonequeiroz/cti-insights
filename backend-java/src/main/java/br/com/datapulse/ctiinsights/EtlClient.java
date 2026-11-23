package br.com.datapulse.ctiinsights;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
class EtlClient {
    record Request(long telemetriaId, int recebidas, List<ImportData.Row> linhas) {}
    record Result(boolean ok, long telemetriaId) {}

    private final RestClient client;

    EtlClient(RestClient.Builder builder, @Value("${cti.etl.url}") String url,
              @Value("${cti.etl.key}") String key, @Value("${cti.etl.connect-timeout}") Duration connect,
              @Value("${cti.etl.read-timeout}") Duration read) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connect);
        factory.setReadTimeout(read);
        client = builder.baseUrl(url).requestFactory(factory).defaultHeader("X-ETL-Key", key).build();
    }

    boolean process(long id, int received, List<ImportData.Row> rows) {
        try {
            var result = client.post().uri("/etl").contentType(MediaType.APPLICATION_JSON)
                    .body(new Request(id, received, rows)).retrieve().body(Result.class);
            return result != null && result.ok() && result.telemetriaId() == id;
        } catch (RestClientException error) {
            return false;
        }
    }
}
