jQuery( document ).ready( function () {
		var $sketch = $( "#sketch" );
		var $context = $sketch[0].getContext( '2d' );

		var $lastX = -1;
		var $lastY = -1;

		var socket = io.connect( "/", {
			"reconnect"                :true,
			"reconnection delay"       :500,
			"max reconnection attempts":10
		} );

		socket.on( "message", function ( data ) {
			var jsonData;
			try {
				jsonData = JSON.parse(data);
				console.log('val0: ' + jsonData.val0);
				console.log('val1: ' + jsonData.val1);
			} catch(e) {
				console.log("error");
				// データ受信がおかしい場合無視する
				return;
			}
			var max_canvas_x = 523;
			var max_canvas_y = 346;
			var data = {
			   x:jsonData.val0/1024 * max_canvas_x,	
			   y:jsonData.val1/1024 * max_canvas_y,	
			};

			/* Initial position */
			if ( $lastX == -1 ) {
				$lastX = data.x;
				$lastY = data.y;
			}

			$context.moveTo( $lastX, $lastY );
			$context.lineTo( data.x, data.y );

			$lastX = data.x;
			$lastY = data.y;

			$context.strokeStyle = "#000";
			$context.stroke();

		} );


		function process_data( data ) {

			var ret = {
				x:0,
				y:0
			};

			var array = data.split( ',' );

			if ( array.length < 2 )
				return ret;

			ret.x = array[0];
			ret.y = array[1];

			ret = sanitize_size( ret );

			return ret;
		}

		/* Convert pot values to pixel using the canvas size ratio. */
		function sanitize_size( values ) {
			var max_pot = 1024;
			var max_canvas_x = 523;
			var max_canvas_y = 346;

			values.x = values.x * ( max_canvas_x / max_pot );
			values.y = values.y * ( max_canvas_y / max_pot );

			return values;
		}

	}
);