#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt")

(define (get-anonymous-name)
  (define (proc n)
    (let ((name (string-append "anonymous" (~a n))))
      (if (hash-has-key? (ws-pool) name)
          (proc (+ n 1))
          name)))
  (proc 1))

(define (login client content) 
  "return name"
  (let ((name (if (equal? "anonymous" (hash-ref content 'name))
				(get-anonymous-name)
				(hash-ref content 'name))))
            
          (if (or (hash-has-key? (ws-pool) name) (equal? name "") (not (string? name)))
              (begin(if(or (equal? name "") (not (string? name)))
                       (ws-send! client (jsexpr->string
                                         `#hasheq((type . "account")
                                                  (type2 . "login")
                                                  (content . #hasheq((name . ,name)
                                                                     (status . "nullname"))))))
                       (ws-send! client (jsexpr->string
                                         `#hasheq((type . "account")
                                                  (type2 . "login")
                                                  (content . #hasheq((name . ,name)
                                                                     (status . "duplicate")))))))
                    (ws-close! client)
                   )
              (begin (lock-ws-pool (thunk (ws-pool (hash-set (ws-pool) name client))))
                     (lock-name-status (thunk (name-status name (hash 'state  "rooms" 'sema (make-semaphore 1)))))
                   (ws-send! client (jsexpr->string
                                     `#hasheq((type . "account")
                                              (type2 . "login")
                                              (content . #hasheq((name . ,name)
                                                                 (status . "ok"))))))
                   name))))
(provide login)