<script>
import ChessBoard  from './ChessBoard';
import { Chess } from 'chess.js';

export default {
  name: 'AiBoard',
  extends: ChessBoard,
  data() {
    return {
      engine: null
    }
  },
  methods: {
    undo() {
      this.game.undo();
      this.board.set({ fen: this.game.fen() });
    },
    chooseMove(from, to) {
      const move = this.engine.move({ from, to });
      this.board.set({
        fen: this.engine.fen(),
      });
      setTimeout(this.aiNextMove, 500);
    },
    aiNextMove() {
      let moves = this.engine.moves({ verbose: true });
      let randomMove = moves[Math.floor(Math.random() * moves.length)];
      this.engine.move(randomMove);

      this.board.set({
        fen: this.engine.fen(),
      });
    },
  },
  mounted() {
    this.engine = new Chess();
    this.board.set({
      movable: {
        fen: this.engine.fen(),
        events: { after: this.chooseMove }
      },
    });
  }
}
</script>
