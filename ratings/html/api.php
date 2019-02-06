<?php
require_once 'API.class.php';

use Monolog\Logger;

class RatingsAPI extends API {
    public function __construct($request, $origin) {
        parent::__construct($request);
        // Logging
        $this->logger = new Logger('RatingsAPI');
        $this->logger->pushHandler($this->logHandler);
    }

    protected function health() {
        $this->logger->info('health OK');
        return 'OK';
    }

    protected function dump() {
        $data = array();
        $data['method'] = $this->method;
        $data['verb'] = $this->verb;
        $data = array_merge($data, array('args' => $this->args));

        return $data;
    }

    // ratings/fetch/sku
    protected function fetch() {
        if($this->method == 'GET' && isset($this->verb) && count($this->args) == 0) {
            $sku = $this->verb;
            if(! $this->_checkSku($sku)) {
                throw new Exception("$sku not found", 404);
            }
            $data = $this->_getRating($sku);
            return $data;
        } else {
            $this->logger->warn('fetch rating - bad request');
            throw new Exception('Bad request', 400);
        }
    }

    // ratings/rate/sku/score
    protected function rate() {
        if($this->method == 'PUT' && isset($this->verb) && count($this->args) == 1) {
            $sku = $this->verb;
            $score = intval($this->args[0]);
            $score = min(max(1, $score), 5);

            if(! $this->_checkSku($sku)) {
                throw new Exception("$sku not found", 404);
            }

            $rating = $this->_getRating($sku);
            if($rating['avg_rating'] == 0) {
                // not rated yet
                $this->_insertRating($sku, $score);
            } else {
                // iffy maths
                $newAvg = (($rating['avg_rating'] * $rating['rating_count']) + $score) / ($rating['rating_count'] + 1);
                $this->_updateRating($sku, $newAvg, $rating['rating_count'] + 1);
            }
        } else {
            $this->logger->warn('set rating - bad request');
            throw new Exception('Bad request', 400);
        }

        return 'OK';
    }

    private function _getRating($sku) {
        $db = $this->_dbConnect();
        if($db) {
            $stmt = $db->prepare('select avg_rating, rating_count from ratings where sku = ?');
            if($stmt->execute(array($sku))) {
                $data = $stmt->fetch();
                if($data) {
                    // for some reason avg_rating is return as a string
                    $data['avg_rating'] = floatval($data['avg_rating']);
                    return $data;
                } else {
                    // nicer to return an empty record than throw 404
                    return array('avg_rating' => 0, 'rating_count' => 0);
                }
            } else {
                $this->logger->error('failed to query data');
                throw new Exception('Failed to query data', 500);
            }
        } else {
            $this->logger->error('database connection error');
            throw new Exception('Database connection error', 500);
        }
    }

    private function _updateRating($sku, $score, $count) {
        $db = $this->_dbConnect();
        if($db) {
            $stmt = $db->prepare('update ratings set avg_rating = ?, rating_count = ? where sku = ?');
            if(! $stmt->execute(array($score, $count, $sku))) {
                $this->logger->error('failed to update rating');
                throw new Exception('Failed to update data', 500);
            }
        } else {
            $this->logger->error('database connection error');
            throw new Exception('Database connection error', 500);
        }
    }

    private function _insertRating($sku, $score) {
        $db = $this->_dbConnect();
        if($db) {
            $stmt = $db->prepare('insert into ratings(sku, avg_rating, rating_count) values(?, ?, ?)');
            if(! $stmt->execute(array($sku, $score, 1))) {
                $this->logger->error('failed to insert data');
                throw new Exception('Failed to insert data', 500);
            }
        } else {
            $this->logger->error('database connection error');
            throw new Exception('Database connection error', 500);
        }
    }

    private function _dbConnect() {
        $dsn = getenv('PDO_URL') ? getenv('PDO_URL') : 'mysql:host=mysql;dbname=ratings;charset=utf8mb4';
        $opt = array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        );

        $db = false;
        try {
            $db = new PDO($dsn, 'ratings', 'iloveit', $opt);
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            $this->logger->error("Database error $msg");
            $db = false;
        }

        return $db;
    }

    // check sku exists in product catalogue
    private function _checkSku($sku) {
        $url = getenv('CATALOGUE_URL') ? getenv('CATALOGUE_URL') : 'http://catalogue:8080/';
        $url = $url . 'product/' . $sku;

        $opt = array(
            CURLOPT_RETURNTRANSFER => true,
        );
        $curl = curl_init($url);
        curl_setopt_array($curl, $opt);

        $data = curl_exec($curl);
        if(! $data) {
            $this->logger->error('failed to connect to catalogue');
            throw new Exception('Failed to connect to catalogue', 500);
        }
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $this->logger->info("catalogue status $status");

        curl_close($curl);

        return $status == 200;

    }
}

if(!array_key_exists('HTTP_ORIGIN', $_SERVER)) {
    $_SERVER['HTTP_ORIGIN'] = $_SERVER['SERVER_NAME'];
}

try {
    $API = new RatingsAPI($_REQUEST['request'], $_SERVER['HTTP_ORIGIN']);
    echo $API->processAPI();
} catch(Exception $e) {
    echo json_encode(Array('error' => $e->getMessage()));
}
?>
