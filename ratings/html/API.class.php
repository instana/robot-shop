<?php
// load composer installed files
require_once(__DIR__.'/vendor/autoload.php');
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

abstract class API {
    protected $method = '';

    protected $endpoint = '';

    protected $verb = '';

    protected $args = array();

    protected $file = Null;

    protected $logger = Null;

    protected $logHandler = Null;

    public function __construct($request) {
        // Logging
        $this->logHandler = new StreamHandler('php://stdout', Logger::INFO);

        // CORS
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: *');
        header('Content-Type: application/json');

        $this->args = explode('/', rtrim($request, '/'));
        $this->endpoint = array_shift($this->args);

        if(array_key_exists(0, $this->args) && !is_numeric($this->args[0])) {
            $this->verb = array_shift($this->args);
        }

        $this->method = $_SERVER['REQUEST_METHOD'];
        if($this->method == 'POST' && array_key_exists('HTTP_X_METHOD', $_SERVER)) {
            if($_SERVER['HTTP_X_HTTP_METHOD'] == 'DELETE') {
                $this->method = 'DELETE';
            } else if($_SERVER['HTTP_X_HTTP_METHOD'] == 'PUT') {
                $this->method = 'PUT';
            } else {
                throw new Exception('Unexpected header');
            }
        }

        switch($this->method) {
        case 'DELETE':
        case 'POST':
            $this->request = $this->_cleanInputs($_POST);
            break;
        case 'GET':
            $this->request = $this->_cleanInputs($_GET);
            break;
        case 'PUT':
            $this->request = $this->_cleanInputs($_GET);
            $this->file = file_get_contents('php://input');
            break;
        }
    }

    public function processAPI() {
        if(method_exists($this, $this->endpoint)) {
            try {
                $result = $this->{$this->endpoint}();
                return $this->_response($result, 200);
            } catch (Exception $e) {
                return $this->_response($e->getMessage(), $e->getCode());
            }
        }
        return $this->_response("No endpoint: $this->endpoint", 404);
    }

    private function _response($data, $status = 200) {
        header('HTTP/1.1 ' . $status . ' ' . $this->_requestStatus($status));
        return json_encode($data);
    }

    private function _cleanInputs($data) {
        $clean_input = array();

        if(is_array($data)) {
            foreach($data as $k => $v) {
                $clean_input[$k] = $this->_cleanInputs($v);
            }
        } else {
            $clean_input = trim(strip_tags($data));
        }

        return $clean_input;
    }

    private function _requestStatus($code) {
        $status = array(
            200 => 'OK',
            400 => 'Bad Request',
            404 => 'Not Found',
            405 => 'Method Not Allowed',
            500 => 'Internal Server Error');

        return (array_key_exists("$code", $status) ? $status["$code"] : $status['500']);
    }
}
?>
