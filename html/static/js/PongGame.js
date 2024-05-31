import { navigateTo } from "./index.js";
import { showGamePauseMenu, hideGamePauseMenu } from "./shared.js";

const FPS = 60;
const INTERVAL = 1000 / FPS;
const INITIAL_PADDLE_SPEED = 12;

const scoreAPI = 'https://transcendence.myprojekt.tech/api/score'

class PongGame {
    constructor() {

        /* Declare the Board class */
        this.Board = class Board {
            constructor(object) {
                this.object = object;
                let bounds = object.getBoundingClientRect();
                this.width = bounds.width;
                this.height = bounds.height;
                this.top = bounds.top;
                this.left = bounds.left;
                this.bottom = bounds.bottom;
                this.right = bounds.right;
            }
            update() {
                let bounds = this.object.getBoundingClientRect();
                this.width = bounds.width;
                this.height = bounds.height;
                this.top = bounds.top;
                this.left = bounds.left;
                this.bottom = bounds.bottom;
                this.right = bounds.right;
            }
        }
        this.board = new this.Board(document.getElementById("board"));
        
        /* Declare an IIFE class for the Ball to be able to pass the board element */
        this.Ball = (function(board) {
            return class Ball {
                constructor(object) {
                    this.object = object;
                    let bounds = object.getBoundingClientRect();
                    this.width = bounds.width;
                    this.height = bounds.height;
                    this.x = board.left + (board.width - bounds.width) / 2;
                    this.y = board.top + (board.height - bounds.height) / 2;
                    this.dx = 0;
                    this.dy = 0;
                }
            }
        })(this.board);
        this.ball = new this.Ball(document.getElementById("ball"));

        /* Declare the Paddle class */
        this.Paddle = class Paddle {
            constructor(object) {
                this.object = object;
                let bounds = object.getBoundingClientRect();
                this.width = bounds.width;
                this.height = bounds.height;
                this.y = bounds.y;
                this.dy = 0;
            }
        }
        this.paddleLeft = new this.Paddle(document.getElementById("paddle_l"));
        this.paddleRight = new this.Paddle(document.getElementById("paddle_r"));


        /* Declare all elements that are necessary for a pong game */
        this.scoreLeftObj = document.getElementById('score_l');
        this.scoreRightObj = document.getElementById('score_r');
        this.minutesObj = document.getElementById('minutes');
        this.secondsObj = document.getElementById('seconds');
        this.pauseMenu = document.getElementById('PauseMenu');
        this.countdownWindow = document.getElementById('CountdownWindow');
        this.countdownText = document.getElementById('CountdownText');
        this.continueButton = document.getElementById('PauseContinueButton');
        this.quitButton = document.getElementById('PauseMenuQuitButton');
        this.finalScoreWindow = document.getElementById('FinalScore');

        /* Declare variables for the game logic */
        this.gameRunning = true;
        this.startTime = 0;
        this.timeInterval = 0;
        this.loopInterval = 0;
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.paddleSpeed = INITIAL_PADDLE_SPEED;

        /* countdown variables */
        this.seconds = 5;
        this.countdownInterval = 0;

        this.resetPaddles();
        this.resetBall();

        this.attachEventListeners();
    }

    getPauseMenuVisibility() {
        if (this.pauseMenu.classList.contains('hidden')) {
            return false;
        }
        return true;
    }

    attachEventListeners() {

        this.handleKeyDown = (event) => {
            if (event.key == 'Enter') {
                if (!this.finalScoreWindow.classList.contains('hidden')) {
                    this.removeEventListeners();
                    navigateTo('/');
                } else if (!this.loopInterval && !this.getPauseMenuVisibility()) {
                    this.countdown();
                } else if (this.getPauseMenuVisibility()) {
                    this.resumeGame();
                }
            }
            if (event.key == 'Escape') {
                this.pauseGame();
            }
            if (event.key == 'ArrowUp') {
                this.paddleRight.dy = -this.paddleSpeed;
            }
            if (event.key == 'ArrowDown') {
                this.paddleRight.dy = this.paddleSpeed;
            }
            if (event.key == 'w') {
                this.paddleLeft.dy = -this.paddleSpeed;
            }
            if (event.key == 's') {
                this.paddleLeft.dy = this.paddleSpeed;
            }
        }

        this.handleKeyUp = (event) => {
            if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
                this.paddleRight.dy = 0
            }
            if (event.key == 'w' || event.key == 's') {
                this.paddleLeft.dy = 0
            }
        }

        this.handlePauseContinue = () => {
            // TODO: implement this function
            this.resumeGame();
        }

        this.handlePauseQuit = () => {
            // TODO: add a delete method if the game is quit early
            navigateTo('/');
        }

        this.handleResize = () => {
            this.board.update();
        }

        /* add the event listeners */
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.continueButton.addEventListener('click', this.handlePauseContinue);
        this.quitButton.addEventListener('click', this.handlePauseQuit);
        window.addEventListener('resize', this.handleResize);
    }

    removeEventListeners() {
        /* remove the event listeners for a clean exit */
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.continueButton.removeEventListener('click', this.handlePauseContinue);
        this.quitButton.removeEventListener('click', this.handlePauseQuit);
        window.removeEventListener('resize', this.handleResize);
    }

    resetPaddles() {
        const centerPos = (this.board.height - this.paddleLeft.height) * 0.5;
        this.paddleLeft.y = centerPos;
        this.paddleRight.y = centerPos;
        this.paddleLeft.object.style.top = centerPos + 'px';
        this.paddleRight.object.style.top = centerPos + 'px';
    }

    updateBall() {
        this.ball.object.style.left = this.ball.x + 'px';
        this.ball.object.style.top = this.ball.y + 'px';
    }

    logScores() {
        if (this.scoreLeft >= 3 || this.scoreRight >= 3) {
            this.gameOver();
        }
        this.resetBall();
        this.resetPaddles();
    }

    resetBall() {
        this.board.update();
        this.ball.x = this.board.width * 0.5 + this.board.left - this.ball.width * 0.5;
        this.ball.y = this.board.height * 0.5 + this.board.top - this.ball.height * 0.5;
        this.updateBall();
    }

    updatePaddle(paddle) {
        if (paddle.dy == 0) {
            return;
        }
        let newPos = 0;
        if (paddle.dy < 0) {
            newPos = Math.max(this.board.top, paddle.y);
        } else if (paddle.dy > 0) {
            let bounds = paddle.object.getBoundingClientRect();
            newPos = Math.min(this.board.bottom - bounds.height, paddle.y);
        }
        paddle.y = newPos;
        paddle.object.style.top = newPos + 'px';
    }

    getCenterPoint(obj) {
        let bounds = obj.getBoundingClientRect();
        let x = bounds.width * 0.5 + bounds.left;
        let y = bounds.height * 0.5 + bounds.top;
        return { x: x, y: y };
    }

    intersectPaddle(obj, center, centerNew) {
        let bounds = obj.getBoundingClientRect();
        let paddleCenterHeight = bounds.left + bounds.width * 0.5;
        if (Math.sign(paddleCenterHeight - center.x) != Math.sign(paddleCenterHeight - centerNew.x)) {
            if ((center.y > bounds.top && center.y < bounds.bottom) ||
                (centerNew.y > bounds.top && centerNew.y < bounds.bottomw)) {
                    return true;
            }
        }
        return false;
    }

    moveBall() {
        let newLeft = this.ball.x + this.ball.dx;
        let newTop = this.ball.y + this.ball.dy;

        if (newLeft > this.board.right - this.ball.width) {
            this.scoreLeft++;
            this.scoreLeftObj.innerHTML = this.scoreLeft;
            this.logScores();
            this.stopGame();
            return;
        } else if (newLeft < this.board.left) {
            this.scoreRight++;
            this.scoreRightObj.innerHTML = this.scoreRight;
            this.logScores();
            this.stopGame();
            return;
        }

        if (newTop < this.board.top) {
            this.ball.dy = -this.ball.dy;
            newTop = this.board.top - newTop + this.board.top;
        } else if (newTop > this.board.bottom - this.ball.height) {
            this.ball.dy = -this.ball.dy;
            newTop = this.board.bottom - this.ball.height - newTop + (this.board.bottom - this.ball.height);
        }

        let centerPoint = this.getCenterPoint(this.ball.object);
        let centerPointNew = { x: centerPoint.x + this.ball.dx, y: centerPoint.y + this.ball.dy };

        if (this.intersectPaddle(this.paddleLeft.object, centerPoint, centerPointNew) ||
            this.intersectPaddle(this.paddleRight.object, centerPoint, centerPointNew)) {
                this.ball.dx = -this.ball.dx;
                if (this.ball.dx < 0) {
                    this.ball.dx -= Math.round(Math.random() * 2);
                } else {
                    this.ball.dx += Math.round(Math.random() * 2);
                }
                if (this.ball.dy < 0) {
                    this.ball.dy -= Math.round(Math.random() * 2);
                } else {
                    this.ball.dy += Math.round(Math.random() * 2);
                }
                this.paddleSpeed += Math.round(Math.random());
                newLeft = this.ball.x + this.ball.dx;
            }
            this.ball.x = newLeft;
            this.ball.y = newTop;
            this.updateBall();
    }

    padTime(num) {
        let s = '00' + num;
        return s.substring(s.length - 2);
    }

    updateTime() {
        let now = new Date().getTime();
        let millisPassed = now - this.startTime;
        this.minutesObj.innerHTML = this.padTime(Math.floor(millisPassed * 0.001 / 60));
        this.secondsObj.innerHTML = this.padTime(Math.floor((millisPassed * 0.001) % 60));
    }

    loop() {
        this.paddleLeft.y += this.paddleLeft.dy;
        this.paddleRight.y += this.paddleRight.dy;
        this.updatePaddle(this.paddleLeft);
        this.updatePaddle(this.paddleRight);
        this.moveBall();
    }

    countdown() {
        this.countdownWindow.classList.remove('hidden');
        this.countdownInterval = window.setInterval(() => this.decrementCountdown(), 1000);
        this.decrementCountdown();
    }
    
    decrementCountdown() {
        this.countdownText.innerHTML = this.seconds + '';
        if (this.seconds === 0) {
            window.clearInterval(this.countdownInterval);
            this.countdownWindow.classList.add('hidden');
            this.seconds = 2;
            this.startGame();
        } else {
            this.seconds--;
        }
    }

    startGame() {
        if (!this.startTime) {
            this.startTime = new Date().getTime();
            this.updateTime();
            this.timeInterval = window.setInterval(() =>this.updateTime(), 500);
        }
        this.ball.dx = (Math.floor(Math.random() * 4) + 3) * (Math.random() < 0.5 ? -1 : 1);
        this.ball.dy = (Math.floor(Math.random() * 4) + 3) * (Math.random() < 0.5 ? -1 : 1);
        this.loopInterval = window.setInterval(() => this.loop(), INTERVAL);
    }
    
    stopGame() {
        if (this.loopInterval) {
            window.clearInterval(this.loopInterval);
            this.loopInterval = 0;
            this.paddleSpeed = INITIAL_PADDLE_SPEED;
        }
    }

    resetGame() {
        if (this.loopInterval) {
            window.clearInterval(this.loopInterval);
            this.loopInterval = 0;
            this.paddleSpeed = INITIAL_PADDLE_SPEED;
        }
        this.removeEventListeners();
    }

    pauseGame() {
        this.stopGame();
        if (!this.getPauseMenuVisibility()) {
            showGamePauseMenu();
        }
    }

    resumeGame() {
        hideGamePauseMenu();
        this.loopInterval = window.setInterval(() => this.loop(), INTERVAL);
    }

    gameOver() {
        this.gameRunning = false;
        this.stopGame();
        this.resetBall();
        window.clearInterval(this.timeInterval);
        this.minutesObj.innerHTML = '00';
        this.secondsObj.innerHTML = '00';

        this.finalScoreWindow.classList.remove('hidden');
        this.ball.object.classList.add('hidden');

        let raw = JSON.stringify({
            "opponent": sessionStorage.getItem('opponent_name'),
            "own_score": score_l,
            "opponent_score": score_r,
            "win": score_l > score_r,
            "game_id": sessionStorage.getItem('game_id'),
        });

        fetch(scoreAPI, {
            method: 'POST',
            body: raw
        })
        .then(response => {
            console.log(response.text());
        })
        .catch(error => console.log('error', error));
    }
}

let currentPongGame = null;

export const startPongGame = () => {
    if (currentPongGame) {
        currentPongGame.resetGame();
        currentPongGame = null;
    }
    currentPongGame = new PongGame();
};