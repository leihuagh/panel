import React from 'react';
import { observer, inject } from 'mobx-react';
import { graphql } from 'react-apollo';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import Card, { CardContent } from 'material-ui/Card';
import Loading from 'components/Utils/Loading';
import gql from 'graphql-tag';
import styles from './style.module.css';

@graphql(gql`
  query AllObjects($projectSearch: ProjectSearchInput){
    projects(projectSearch: $projectSearch) {
      nextCursor
      page
      count
      entries {
        id
      }
    }
    releases {
      count
    }
    features {
      count
    }
    users {
      id
    }
  }
`,{
  options: {
    variables: {
      projectSearch: {
        bookmarked: true,
        repository: "/",
      }
    },
    fetchPolicy: 'network-only'
  }
})


@inject("store") @observer

export default class Dashboard extends React.Component {
  state = {
    anchorEl: undefined,
    open: false,
    expanded: null,
  };

  handleClick = event => {
    this.setState({ open: true, anchorEl: event.currentTarget });
  };

  handleRequestClose = () => {
    this.setState({ open: false });
  };

  componentWillMount() {
    this.props.store.app.setNavProjects(this.props.projects)
  }

  componentWillReact() {
    const { projects } = this.props.data;
    this.props.store.app.setNavProjects(projects.entries)
  }
  
  handleChange = panel => (event, expanded) => {
    this.setState({
      expanded: expanded ? panel : false,
    });
  }

  copyGitHash(featureHash){
    this.props.store.app.setSnackbar({msg: "Git hash copied: " + featureHash, open: true });
  }  

  render() {
    const { loading, projects, releases, features, users } = this.props.data;
    if(loading){
      return <Loading />
    }

    let { expanded } = this.state;
    if (expanded === null) {
      expanded = 0
    }    
    return (
      <div className={styles.root}>
        <Grid container spacing={24} className={styles.info}>
          {/* Projects */}
          <Grid item xs={3}>
            <Card className={styles.projectsCard}>
              <CardContent>
                <Typography variant="headline" component="h2" className={styles.title}>
                  Projects
                </Typography>
                <Typography component="headline" className={styles.bigNumber}>
                  {projects.count}
                </Typography>
              </CardContent>
            </Card>        
          </Grid>
            {/* Features */}
          <Grid item xs={3}>
            <Card className={styles.featuresCard}>
              <CardContent>
                <Typography variant="headline" component="h2" className={styles.title}>
                  Features
                </Typography>
                <Typography component="headline" className={styles.bigNumber}>
                  {features.count}
                </Typography>
              </CardContent>
            </Card>        
          </Grid>
            {/* Releases */}
          <Grid item xs={3}>
            <Card className={styles.releasesCard}>
              <CardContent>
                <Typography variant="headline" component="h2" className={styles.title}>
                  Releases
                </Typography>
                <Typography component="headline" className={styles.bigNumber}>
                  {releases.count}
                </Typography>
              </CardContent>
            </Card>        
          </Grid>
            {/* Users */}
          <Grid item xs={3}>
            <Card className={styles.usersCard}>
              <CardContent>
                <Typography variant="headline" component="h2" className={styles.title}>
                  Users
                </Typography>
                <Typography component="headline" className={styles.bigNumber}>
                  {users.length}
                </Typography>
              </CardContent>
            </Card>        
          </Grid>
        </Grid>                   
      </div>
    );
  }
}
