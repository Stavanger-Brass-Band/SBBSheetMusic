<script>
  export let set;
</script>

<style>
  .set-card {
    background-color: white;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding-top: 130%;
    margin-bottom: 40px;
    outline: none;
    box-shadow:
        /* The top layer shadow */ 0 1px 1px rgba(0, 0, 0, 0.15),
      /* The second layer */ 0 10px 0 -5px #eee,
      /* The second layer shadow */ 0 10px 1px -4px rgba(0, 0, 0, 0.15),
      /* The third layer */ 0 20px 0 -10px #eee,
      /* The third layer shadow */ 0 20px 1px -9px rgba(0, 0, 0, 0.15);
    transition: all 300ms ease;
    text-align: center;
    color: black;
  }

  .set-card:before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    border-style: solid;
    width: 0;
    border-width: 0;
    border-color: #272b30 #272b30 rgba(255, 255, 255, 0.3)
      rgba(255, 255, 255, 0.3);
    box-shadow: -3px 3px 5px rgba(0, 0, 0, 0.2);
    transition: border-width 0.3s;
  }

  .set-card:hover,
  .set-card:focus {
    width: calc(100% + 16px);
    margin-left: -8px;
    margin-bottom: 25px;
    padding-top: 135%;
    margin-top: -8px;
    box-shadow:
      /* The top layer shadow */ 0 1px 1px rgba(0, 0, 0, 0.15),
      /* The second layer */ 0 15px 0 -5px #eee,
      /* The second layer shadow */ 0 15px 1px -4px rgba(0, 0, 0, 0.15),
      /* The third layer */ 0 30px 0 -10px #eee,
      /* The third layer shadow */ 0 30px 1px -9px rgba(0, 0, 0, 0.15);
  }

  .set-card:hover:before,
  .set-card:focus:before {
    border-width: 26px;
  }

  .set-card:hover .title,
  .set-card:focus .title {
    padding-left: 28px;
    padding-right: 28px;
  }

  .set-card .set-art {
    position: absolute;
    top: 0;
    left: 0;
    max-width: 100%;
    opacity: 0.5;
  }

  .set-card .title {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    padding: 20px;
    transition: all 300ms ease;
  }

  .set-card .info {
    width: calc(100% - 4rem);
    border-top: 1px solid #ddd;
    padding-top: 8px;
    position: absolute;
    font-size: 12px;
    bottom: 16px;
  }

  @media screen and (max-width: 767px) {
    .set-card .title {
      padding: 12px;
    }

    .set-card:hover .title,
    .set-card:focus .title {
      padding-left: 16px;
      padding-right: 16px;
    }

    .set-card .title h3 {
      font-size: 1.5rem;
    }

    .set-card .set-art {
      max-width: 80%;
    }
  }

  @media screen and (max-width: 575px) {
    .set-card:hover .title,
    .set-card:focus .title {
      padding-left: 14px;
      padding-right: 14px;
    }

    .set-card .title {
      padding: 8px;
    }

    .set-card .title h3 {
      font-size: 1.25rem;
    }

    .set-card .info {
      width: calc(100% - 2rem);
    }

    .set-card:hover {
      margin-bottom: 40px;
    }
  }
</style>

<a class="set-card" href={'#/set/' + set.id}>
  <img class="set-art" src="/img/music-notes.png" alt="Music notes" />
  <div class="title">
    <h3>{set.title}</h3>
  </div>
  <div class="info">
    <div>{set.composer ? set.composer : ''}</div>
    {#if set.arranger}
      <div>Arr. {set.arranger}</div>
    {/if}
  </div>
</a>
